import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import type Redis from 'ioredis';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { REDIS_CLIENT } from '../../config/redis.module';
import {
  ErrandAttachment,
  ErrandOrder,
  ErrandOrderDetail,
  ErrandPriceSnapshot,
  ErrandQuote,
  ErrandTimeline,
  type ErrandAddressSnapshot,
  type ErrandPriceSnapshotPayload,
} from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { ErrandPricingService } from '../errand-pricing/errand-pricing.service';
import { ErrandTypeService } from '../errand-type/errand-type.service';
import { IntegrationGatewayService } from '../integration-gateway/integration-gateway.service';
import { PaymentService } from '../payment/payment.service';
import { ProhibitedItemService } from '../prohibited-item/prohibited-item.service';

import type {
  ErrandAddressDto,
  ProhibitedWarningVo,
  QuoteErrandDto,
  QuoteVo,
  SubmitErrandDto,
  SubmitErrandVo,
} from './errand-order.dto';

const QUOTE_TTL_SECONDS = 300; // 5 min
const QUOTE_KEY_PREFIX = 'errand:quote:';
const ORDER_EXPIRE_MS = 15 * 60 * 1000; // 15 min
const ORDER_NO_INCR_KEY_PREFIX = 'errand:order:incr:';

@Injectable()
export class ErrandOrderService {
  constructor(
    @InjectRepository(ErrandQuote) private readonly quoteRepo: Repository<ErrandQuote>,
    @InjectRepository(ErrandOrder) private readonly orderRepo: Repository<ErrandOrder>,
    private readonly typeSvc: ErrandTypeService,
    private readonly pricingSvc: ErrandPricingService,
    private readonly prohibitedSvc: ProhibitedItemService,
    private readonly gateway: IntegrationGatewayService,
    private readonly paymentSvc: PaymentService,
    private readonly eventBus: DomainEventBus,
    private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * 跑腿报价
   * - 校验 typeCode 与 requiredFields
   * - 距离 = map.distance(pickup → delivery)
   * - 计价 = pricing.calc(distance, urgentLevel, weight)
   * - 违禁扫描:命中 REJECT 直接抛 INVALID_PARAM;命中 WARN 在 prohibitedWarnings 中提示
   * - 写 errand_quote + Redis SETEX 5 min
   */
  async quote(customerId: string, dto: QuoteErrandDto): Promise<QuoteVo> {
    // 1. 类型校验 + requiredFields
    const type = await this.typeSvc.findByCode(dto.typeCode);
    this.validateRequiredFields(type.requiredFields, dto);

    // 2. 距离
    const distanceMeters = await this.calcDistance(dto.pickupAddress, dto.deliveryAddress);

    // 3. 计价
    const pricing = await this.pricingSvc.calc({
      distanceMeters,
      urgentLevel: dto.urgentLevel,
      weightKg: dto.weight ?? null,
    });

    // 4. 违禁扫描(itemDesc + taskDesc + 地址 address 字段拼接)
    const scanText = [
      dto.itemDesc ?? '',
      dto.taskDesc ?? '',
      dto.deliveryAddress.address,
      dto.pickupAddress?.address ?? '',
    ].join(' | ');
    const hits = await this.prohibitedSvc.check(scanText);
    if (ProhibitedItemService.hasReject(hits)) {
      const rejected = hits
        .filter((h) => h.level === 'REJECT')
        .map((h) => h.keyword)
        .join(',');
      throw new BadRequestException({
        code: ErrorCode.INVALID_PARAM,
        detail: 'PROHIBITED_REJECT',
        message: `禁止配送的物品: ${rejected}`,
        hits,
      });
    }
    const warnings: ProhibitedWarningVo[] = hits.map((h) => ({
      keyword: h.keyword,
      level: h.level,
      description: h.description,
    }));

    // 5. 写 errand_quote
    const now = Date.now();
    const expireAt = now + QUOTE_TTL_SECONDS * 1000;
    const ins = await this.quoteRepo.insert({
      customerId,
      typeCode: dto.typeCode,
      pickupAddress: dto.pickupAddress ? this.toSnapshot(dto.pickupAddress) : null,
      deliveryAddress: this.toSnapshot(dto.deliveryAddress),
      weight: dto.weight != null ? String(dto.weight) : null,
      urgentLevel: dto.urgentLevel,
      budget: dto.budget != null ? String(dto.budget) : null,
      distanceMeters,
      baseFee: pricing.baseFee,
      distanceFee: pricing.distanceFee,
      urgentFee: pricing.urgentFee,
      payableAmount: pricing.payableAmount,
      itemDesc: dto.itemDesc ?? null,
      taskDesc: dto.taskDesc ?? null,
      reservedTime: dto.reservedTime != null ? String(dto.reservedTime) : null,
      prohibitedWarnings: warnings,
      usedOrderId: null,
      expireAt: String(expireAt),
      createdAt: String(now),
    });
    const quoteId = String(ins.identifiers[0]?.errandQuoteId ?? '');

    // 6. Redis SETEX
    await this.redis
      .set(
        `${QUOTE_KEY_PREFIX}${quoteId}`,
        JSON.stringify({
          customerId,
          payableAmount: pricing.payableAmount,
          expireAt,
        }),
        'EX',
        QUOTE_TTL_SECONDS,
      )
      .catch(() => null);

    // 7. 事件
    await this.eventBus.publish(
      EventName.ErrandQuoteCreated,
      {
        quoteId,
        customerId,
        typeCode: dto.typeCode,
        payableAmount: pricing.payableAmount,
        expireAt,
        createdAt: now,
      },
      { bizType: 'errand-quote', bizId: quoteId },
    );

    return {
      quoteId,
      baseFee: pricing.baseFee,
      distanceFee: pricing.distanceFee,
      urgentFee: pricing.urgentFee,
      payableAmount: pricing.payableAmount,
      expireAt,
      prohibitedWarnings: warnings,
      distanceMeters,
    };
  }

  /**
   * 提交跑腿订单
   * - 校验 quoteId 未过期 + 未被使用
   * - 事务:INSERT errand_order + detail + attachment + price_snapshot + timeline + 标记 quote.used
   * - 调 paymentSvc.prepay(bizType='ERRAND') 返 payOrderId
   * - 发 ErrandOrderCreated
   */
  async submit(customerId: string, dto: SubmitErrandDto): Promise<SubmitErrandVo> {
    const quote = await this.quoteRepo.findOne({ where: { errandQuoteId: dto.quoteId } });
    if (!quote || quote.customerId !== customerId) {
      throw new NotFoundException({
        code: ErrorCode.DATA_NOT_FOUND,
        detail: 'QUOTE_NOT_FOUND',
        message: '报价不存在',
      });
    }
    if (Number(quote.expireAt) < Date.now()) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'QUOTE_EXPIRED',
        message: '报价已过期,请重新发起报价',
      });
    }
    if (quote.usedOrderId) {
      throw new UnprocessableEntityException({
        code: ErrorCode.DUPLICATE_REQUEST,
        detail: 'QUOTE_ALREADY_USED',
        message: '该报价已被使用',
      });
    }

    const now = Date.now();
    const expireAt = now + ORDER_EXPIRE_MS;
    const orderNo = await this.generateOrderNo();

    let orderId = '';
    await this.dataSource.transaction(async (em: EntityManager) => {
      const ins = await em.getRepository(ErrandOrder).insert({
        orderNo,
        customerId,
        typeCode: quote.typeCode,
        status: 'WAIT_PAY',
        payStatus: 'unpaid',
        baseFee: quote.baseFee,
        distanceFee: quote.distanceFee,
        urgentFee: quote.urgentFee,
        budget: quote.budget,
        payableAmount: quote.payableAmount,
        urgentLevel: quote.urgentLevel,
        reservedTime: quote.reservedTime,
        expireAt: String(expireAt),
        createdAt: String(now),
        updatedAt: String(now),
      });
      orderId = String(ins.identifiers[0]?.errandOrderId ?? '');

      await em.getRepository(ErrandOrderDetail).insert({
        errandOrderId: orderId,
        pickupAddress: quote.pickupAddress,
        deliveryAddress: quote.deliveryAddress,
        itemDesc: quote.itemDesc,
        taskDesc: quote.taskDesc,
        weight: quote.weight,
        distanceMeters: quote.distanceMeters,
        remark: dto.remark ?? null,
        createdAt: String(now),
        updatedAt: String(now),
      });

      if (dto.attachments && dto.attachments.length > 0) {
        for (let i = 0; i < dto.attachments.length; i++) {
          await em.getRepository(ErrandAttachment).insert({
            errandOrderId: orderId,
            fileId: dto.attachments[i]!,
            sort: i,
            createdAt: String(now),
          });
        }
      }

      const snapshotPayload: ErrandPriceSnapshotPayload = {
        typeCode: quote.typeCode,
        distanceMeters: quote.distanceMeters,
        baseFee: quote.baseFee,
        distanceFee: quote.distanceFee,
        urgentFee: quote.urgentFee,
        payableAmount: quote.payableAmount,
        urgentLevel: quote.urgentLevel,
        weight: quote.weight ?? null,
        budget: quote.budget ?? null,
        prohibitedWarnings: quote.prohibitedWarnings,
      };
      await em.getRepository(ErrandPriceSnapshot).insert({
        errandOrderId: orderId,
        quoteId: dto.quoteId,
        payload: snapshotPayload,
        createdAt: String(now),
      });

      await em.getRepository(ErrandTimeline).insert({
        errandOrderId: orderId,
        eventType: 'CREATED',
        payload: {
          orderNo,
          payableAmount: quote.payableAmount,
          urgentLevel: quote.urgentLevel,
        },
        operator: 'customer',
        createdAt: String(now),
      });

      await em.getRepository(ErrandQuote).update({ errandQuoteId: dto.quoteId }, { usedOrderId: orderId });
    });

    // 调支付服务创建 prepay
    const prepay = await this.paymentSvc.prepay(customerId, {
      bizType: 'ERRAND',
      orderId,
      payChannel: dto.payChannel,
    });

    // 把 payOrderId 回填到 errand_order
    await this.orderRepo.update(
      { errandOrderId: orderId },
      { payOrderId: prepay.payOrderId, updatedAt: String(Date.now()) },
    );

    await this.eventBus.publish(
      EventName.ErrandOrderCreated,
      {
        orderId,
        orderNo,
        customerId,
        typeCode: quote.typeCode,
        payableAmount: quote.payableAmount,
        expireAt,
        createdAt: now,
      },
      { bizType: 'errand-order', bizId: orderId },
    );

    return {
      orderId,
      orderNo,
      payOrderId: prepay.payOrderId,
      status: 'WAIT_PAY',
      expireAt,
    };
  }

  // —— 内部工具 ——

  private validateRequiredFields(required: string[], dto: QuoteErrandDto): void {
    const provided: Record<string, unknown> = {
      pickupAddress: dto.pickupAddress,
      deliveryAddress: dto.deliveryAddress,
      weight: dto.weight,
      urgentLevel: dto.urgentLevel,
      budget: dto.budget,
      itemDesc: dto.itemDesc,
      taskDesc: dto.taskDesc,
    };
    const missing: string[] = [];
    for (const f of required) {
      const v = provided[f];
      if (v == null) missing.push(f);
      else if (typeof v === 'string' && v.trim() === '') missing.push(f);
    }
    if (missing.length > 0) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_PARAM,
        detail: 'REQUIRED_FIELDS_MISSING',
        message: `必填字段缺失: ${missing.join(',')}`,
        missing,
      });
    }
  }

  private async calcDistance(pickup: ErrandAddressDto | undefined, delivery: ErrandAddressDto): Promise<number> {
    if (!pickup || pickup.lng == null || pickup.lat == null) return 0;
    if (delivery.lng == null || delivery.lat == null) return 0;
    return this.gateway.amap.distance({ lng: pickup.lng, lat: pickup.lat }, { lng: delivery.lng, lat: delivery.lat });
  }

  private toSnapshot(d: ErrandAddressDto): ErrandAddressSnapshot {
    return {
      address: d.address,
      name: d.name,
      mobile: d.mobile,
      lng: d.lng,
      lat: d.lat,
    };
  }

  private async generateOrderNo(): Promise<string> {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const date = `${y}${m}${day}`;
    const incrKey = `${ORDER_NO_INCR_KEY_PREFIX}${date}`;
    const incr = await this.redis.incr(incrKey).catch(() => Math.floor(Math.random() * 1_000_000));
    if (incr === 1) {
      // 设 24 小时过期
      await this.redis.expire(incrKey, 24 * 3600).catch(() => null);
    }
    return `E${date}${String(incr).padStart(6, '0')}`;
  }
}
