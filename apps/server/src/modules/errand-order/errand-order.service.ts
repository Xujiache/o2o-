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
import { DataSource, EntityManager, In, Repository } from 'typeorm';

import { REDIS_CLIENT } from '../../config/redis.module';
import {
  ErrandAttachment,
  ErrandOrder,
  ErrandOrderDetail,
  ErrandPriceSnapshot,
  ErrandQuote,
  ErrandTask,
  ErrandTimeline,
  type ErrandAddressSnapshot,
  type ErrandOrderUrgentLevel,
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
  CancelErrandDto,
  CancelErrandVo,
  ErrandAddressDto,
  ErrandOrderDetailVo,
  ErrandOrderListItemVo,
  ErrandOrderListVo,
  ErrandTimelineItemVo,
  ErrandTrackVo,
  ListErrandQueryDto,
  ProhibitedWarningVo,
  QuoteErrandDto,
  QuoteVo,
  RemarkErrandDto,
  RemarkErrandVo,
  SubmitErrandDto,
  SubmitErrandVo,
  UrgentErrandDto,
  UrgentErrandVo,
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
    @InjectRepository(ErrandOrderDetail)
    private readonly detailRepo: Repository<ErrandOrderDetail>,
    @InjectRepository(ErrandAttachment)
    private readonly attachmentRepo: Repository<ErrandAttachment>,
    @InjectRepository(ErrandTimeline)
    private readonly timelineRepo: Repository<ErrandTimeline>,
    @InjectRepository(ErrandTask) private readonly taskRepo: Repository<ErrandTask>,
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

  // ===== 列表 (T11) =====

  async list(customerId: string, query: ListErrandQueryDto): Promise<ErrandOrderListVo> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const qb = this.orderRepo.createQueryBuilder('o').where('o.customer_id = :cid', { cid: customerId });

    const status = query.status ?? 'ALL';
    if (status === 'WAIT_PAY') qb.andWhere('o.status = :s', { s: 'WAIT_PAY' });
    else if (status === 'IN_PROGRESS')
      qb.andWhere('o.status IN (:...s)', {
        s: ['PAID', 'DISPATCHING', 'ASSIGNED', 'PICKED_UP', 'DELIVERED'],
      });
    else if (status === 'COMPLETED') qb.andWhere('o.status = :s', { s: 'COMPLETED' });
    else if (status === 'CANCELLED') qb.andWhere('o.status = :s', { s: 'CANCELLED' });

    const total = await qb.getCount();
    const rows = await qb
      .orderBy('o.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    // 批量取 detail(简化:仅取地址)
    const orderIds = rows.map((r) => r.errandOrderId);
    const details = orderIds.length > 0 ? await this.detailRepo.find({ where: { errandOrderId: In(orderIds) } }) : [];
    const detailMap = new Map(details.map((d) => [d.errandOrderId, d]));

    const list: ErrandOrderListItemVo[] = rows.map((r) => {
      const d = detailMap.get(r.errandOrderId);
      return {
        orderId: r.errandOrderId,
        orderNo: r.orderNo,
        typeCode: r.typeCode,
        status: r.status,
        payableAmount: r.payableAmount,
        urgentLevel: r.urgentLevel,
        pickupAddress: d?.pickupAddress?.address ?? null,
        deliveryAddress: d?.deliveryAddress?.address ?? '',
        expireAt: Number(r.expireAt),
        createdAt: Number(r.createdAt),
      };
    });

    return { list, total, page, pageSize };
  }

  // ===== 详情 (T12) =====

  async detail(customerId: string, orderId: string): Promise<ErrandOrderDetailVo> {
    const order = await this.findOwnOrder(customerId, orderId);
    const detail = await this.detailRepo.findOne({ where: { errandOrderId: orderId } });
    const attachments = await this.attachmentRepo.find({
      where: { errandOrderId: orderId },
      order: { sort: 'ASC' },
    });
    const timelineRows = await this.timelineRepo.find({
      where: { errandOrderId: orderId },
      order: { createdAt: 'ASC' },
    });
    const task = await this.taskRepo.findOne({ where: { errandOrderId: orderId } });

    const timeline: ErrandTimelineItemVo[] = timelineRows.map((t) => ({
      eventType: t.eventType,
      createdAt: Number(t.createdAt),
      operator: t.operator,
      payload: t.payload,
    }));

    return {
      orderId: order.errandOrderId,
      orderNo: order.orderNo,
      typeCode: order.typeCode,
      status: order.status,
      payableAmount: order.payableAmount,
      urgentLevel: order.urgentLevel,
      pickupAddress: detail?.pickupAddress?.address ?? null,
      deliveryAddress: detail?.deliveryAddress?.address ?? '',
      expireAt: Number(order.expireAt),
      createdAt: Number(order.createdAt),
      baseFee: order.baseFee,
      distanceFee: order.distanceFee,
      urgentFee: order.urgentFee,
      distanceMeters: detail?.distanceMeters ?? 0,
      weight: detail?.weight ?? null,
      budget: order.budget,
      reservedTime: order.reservedTime != null ? Number(order.reservedTime) : null,
      itemDesc: detail?.itemDesc ?? null,
      taskDesc: detail?.taskDesc ?? null,
      remark: detail?.remark ?? null,
      pickupAddressDetail: (detail?.pickupAddress ?? null) as Record<string, unknown> | null,
      deliveryAddressDetail: (detail?.deliveryAddress ?? {}) as Record<string, unknown>,
      attachmentFileIds: attachments.map((a) => a.fileId),
      timeline,
      actions: this.computeActions(order.status),
      rider: task?.riderId ? { riderId: task.riderId, status: task.status } : null,
      paidAt: order.paidAt != null ? Number(order.paidAt) : null,
    };
  }

  private computeActions(status: ErrandOrder['status']): string[] {
    if (status === 'WAIT_PAY') return ['pay', 'cancel'];
    if (status === 'PAID' || status === 'DISPATCHING') return ['urgent', 'remark', 'track'];
    if (status === 'ASSIGNED' || status === 'PICKED_UP') return ['urgent', 'remark', 'track'];
    if (status === 'DELIVERED') return ['confirm', 'track'];
    if (status === 'COMPLETED') return ['repurchase'];
    return []; // CANCELLED
  }

  // ===== 用户主动取消 (T13) =====

  async cancel(customerId: string, orderId: string, dto: CancelErrandDto): Promise<CancelErrandVo> {
    const order = await this.findOwnOrder(customerId, orderId);
    if (order.status !== 'WAIT_PAY') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'CANCEL_NOT_ALLOWED',
        message: `当前状态(${order.status})不可主动取消`,
      });
    }

    const now = Date.now();
    await this.dataSource.transaction(async (em: EntityManager) => {
      await em.getRepository(ErrandOrder).update(
        { errandOrderId: orderId },
        {
          status: 'CANCELLED',
          cancelledAt: String(now),
          cancelledBy: 'customer',
          cancelReason: dto.reason ?? 'CUSTOMER_CANCEL',
          updatedAt: String(now),
        },
      );
      await em.getRepository(ErrandTimeline).insert({
        errandOrderId: orderId,
        eventType: 'CANCELLED',
        payload: {
          cancelledBy: 'customer',
          reason: dto.reason ?? 'CUSTOMER_CANCEL',
        },
        operator: 'customer',
        createdAt: String(now),
      });
    });

    return { orderId, status: 'CANCELLED' };
  }

  // ===== 加急 (T14) =====

  async urgent(customerId: string, orderId: string, dto: UrgentErrandDto): Promise<UrgentErrandVo> {
    const order = await this.findOwnOrder(customerId, orderId);
    if (!['PAID', 'DISPATCHING', 'ASSIGNED'].includes(order.status)) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'URGENT_NOT_ALLOWED',
        message: `当前状态(${order.status})不可加急`,
      });
    }
    if (order.urgentLevel === dto.urgentLevel) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'URGENT_LEVEL_UNCHANGED',
        message: '加急档位未变化',
      });
    }
    // 不允许降级:standard < fast < express
    const ranks: Record<ErrandOrderUrgentLevel, number> = {
      standard: 0,
      fast: 1,
      express: 2,
    };
    if (ranks[dto.urgentLevel] <= ranks[order.urgentLevel]) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'URGENT_DOWNGRADE_NOT_ALLOWED',
        message: '加急档位仅可上调',
      });
    }
    // 重算
    const detail = await this.detailRepo.findOne({ where: { errandOrderId: orderId } });
    const recalc = await this.pricingSvc.calc({
      distanceMeters: detail?.distanceMeters ?? 0,
      urgentLevel: dto.urgentLevel,
      weightKg: detail?.weight ? Number(detail.weight) : null,
    });
    const newUrgentFee = BigInt(recalc.urgentFee);

    // confirmFee 防漂移(仅校验差额,允许 ±0)
    const oldUrgent = BigInt(order.urgentFee);
    const diff = newUrgentFee - oldUrgent;
    if (BigInt(dto.confirmFee) !== diff) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'CONFIRM_FEE_MISMATCH',
        message: `加急差额校验失败 expected=${diff} actual=${dto.confirmFee}`,
      });
    }

    const now = Date.now();
    await this.dataSource.transaction(async (em: EntityManager) => {
      await em.getRepository(ErrandOrder).update(
        { errandOrderId: orderId },
        {
          urgentFee: recalc.urgentFee,
          urgentLevel: dto.urgentLevel,
          payableAmount: recalc.payableAmount,
          updatedAt: String(now),
        },
      );
      await em.getRepository(ErrandTimeline).insert({
        errandOrderId: orderId,
        eventType: 'PRICE_INCREASED',
        payload: {
          oldUrgentLevel: order.urgentLevel,
          newUrgentLevel: dto.urgentLevel,
          oldUrgentFee: order.urgentFee,
          newUrgentFee: recalc.urgentFee,
          source: 'customer',
        },
        operator: 'customer',
        createdAt: String(now),
      });
    });

    await this.eventBus.publish(
      EventName.ErrandPriceIncreased,
      {
        orderId,
        customerId,
        oldUrgentLevel: order.urgentLevel,
        newUrgentLevel: dto.urgentLevel,
        oldPayable: order.payableAmount,
        newPayable: recalc.payableAmount,
        source: 'customer',
        changedAt: now,
      },
      { bizType: 'errand-order', bizId: orderId },
    );

    return {
      orderId,
      urgentFee: recalc.urgentFee,
      urgentLevel: dto.urgentLevel,
      status: order.status,
      payableAmount: recalc.payableAmount,
    };
  }

  // ===== 补充备注 (T15) =====

  async remark(customerId: string, orderId: string, dto: RemarkErrandDto): Promise<RemarkErrandVo> {
    const order = await this.findOwnOrder(customerId, orderId);
    if (['CANCELLED', 'COMPLETED'].includes(order.status)) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'REMARK_NOT_ALLOWED',
        message: `当前状态(${order.status})不可补充备注`,
      });
    }

    const now = Date.now();
    await this.dataSource.transaction(async (em: EntityManager) => {
      await em
        .getRepository(ErrandOrderDetail)
        .update({ errandOrderId: orderId }, { remark: dto.remark, updatedAt: String(now) });
      if (dto.attachments && dto.attachments.length > 0) {
        const existingMax = await em
          .getRepository(ErrandAttachment)
          .createQueryBuilder('a')
          .where('a.errand_order_id = :id', { id: orderId })
          .orderBy('a.sort', 'DESC')
          .getOne();
        const startSort = (existingMax?.sort ?? -1) + 1;
        for (let i = 0; i < dto.attachments.length; i++) {
          await em.getRepository(ErrandAttachment).insert({
            errandOrderId: orderId,
            fileId: dto.attachments[i]!,
            sort: startSort + i,
            createdAt: String(now),
          });
        }
      }
      await em.getRepository(ErrandTimeline).insert({
        errandOrderId: orderId,
        eventType: 'REMARK_ADDED',
        payload: {
          remark: dto.remark,
          attachmentCount: dto.attachments?.length ?? 0,
        },
        operator: 'customer',
        createdAt: String(now),
      });
      await em.getRepository(ErrandOrder).update({ errandOrderId: orderId }, { updatedAt: String(now) });
    });

    await this.eventBus.publish(
      EventName.ErrandRemarkAdded,
      {
        orderId,
        customerId,
        remark: dto.remark,
        attachmentCount: dto.attachments?.length ?? 0,
        addedAt: now,
      },
      { bizType: 'errand-order', bizId: orderId },
    );

    return {
      orderId,
      latestRemark: dto.remark,
      updatedAt: now,
    };
  }

  // ===== 轨迹 (T16) =====

  async track(customerId: string, orderId: string): Promise<ErrandTrackVo> {
    const order = await this.findOwnOrder(customerId, orderId);
    const task = await this.taskRepo.findOne({ where: { errandOrderId: orderId } });

    if (!task || !['ASSIGNED', 'PICKED_UP', 'DELIVERED'].includes(task.status)) {
      // 还没有骑手接单
      return {
        orderId,
        status: order.status,
        riderLocation: null,
        route: null,
        trackPoints: [],
        eta: null,
      };
    }

    const pickup = task.pickupAddress;
    const delivery = task.deliveryAddress;
    if (!pickup || pickup.lng == null || pickup.lat == null || delivery.lng == null || delivery.lat == null) {
      return {
        orderId,
        status: order.status,
        riderLocation: null,
        route: null,
        trackPoints: [],
        eta: null,
      };
    }

    const route = await this.gateway.amap.route(
      { lng: pickup.lng, lat: pickup.lat },
      { lng: delivery.lng, lat: delivery.lat },
    );

    return {
      orderId,
      status: order.status,
      // stage 6 简化:无骑手实时位置追踪,以取货点近似
      riderLocation: { lng: pickup.lng, lat: pickup.lat },
      route: { totalDistanceMeters: route.totalDistanceMeters, etaMs: route.etaMs },
      trackPoints: route.points.map((p) => ({
        lng: p.lng,
        lat: p.lat,
        distanceFromStart: p.distanceFromStart,
      })),
      eta: Date.now() + route.etaMs,
    };
  }

  // ===== 工具 =====

  private async findOwnOrder(customerId: string, orderId: string): Promise<ErrandOrder> {
    const order = await this.orderRepo.findOne({ where: { errandOrderId: orderId } });
    if (!order || order.customerId !== customerId) {
      throw new NotFoundException({
        code: ErrorCode.DATA_NOT_FOUND,
        detail: 'ERRAND_ORDER_NOT_FOUND',
        message: '跑腿订单不存在',
      });
    }
    return order;
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
