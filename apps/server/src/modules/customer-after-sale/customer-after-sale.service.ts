import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { AfterSale, AfterSaleEvidence, FoodOrder, Store, SysConfig } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import type { ApplyAfterSaleDto, ApplyAfterSaleVo } from './customer-after-sale.dto';

const DEFAULT_AFTER_SALE_WINDOW_DAYS = 7;

@Injectable()
export class CustomerAfterSaleService {
  constructor(
    @InjectRepository(AfterSale) private readonly afterSaleRepo: Repository<AfterSale>,
    @InjectRepository(AfterSaleEvidence)
    private readonly evidenceRepo: Repository<AfterSaleEvidence>,
    @InjectRepository(FoodOrder) private readonly orderRepo: Repository<FoodOrder>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectRepository(SysConfig) private readonly sysConfigRepo: Repository<SysConfig>,
    private readonly eventBus: DomainEventBus,
  ) {}

  private async getAfterSaleWindowDays(): Promise<number> {
    const cfg = await this.sysConfigRepo.findOne({ where: { configKey: 'after_sale.window_days' } });
    if (!cfg) return DEFAULT_AFTER_SALE_WINDOW_DAYS;
    const n = Number(cfg.configValue);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_AFTER_SALE_WINDOW_DAYS;
  }

  async apply(customerId: string, dto: ApplyAfterSaleDto): Promise<ApplyAfterSaleVo> {
    const order = await this.orderRepo.findOne({ where: { foodOrderId: dto.orderId } });
    if (!order) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'order not found' });
    if (order.customerId !== customerId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'order not belong to customer' });
    }
    if (!['DELIVERED', 'COMPLETED', 'AFTER_SALE'].includes(order.status)) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: `cannot apply after-sale at status ${order.status}`,
      });
    }

    if (dto.amountCents > Number(order.payableAmount)) {
      throw new BadRequestException({ code: ErrorCode.INVALID_PARAM, message: 'amount exceeds payable' });
    }

    const completedAtMs = order.completedAt ? Number(order.completedAt) : Number(order.updatedAt);
    const windowDays = await this.getAfterSaleWindowDays();
    if (Date.now() - completedAtMs > windowDays * 24 * 3600 * 1000) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_PARAM,
        message: `after-sale window expired (${windowDays}d)`,
      });
    }

    const existing = await this.afterSaleRepo.findOne({
      where: { orderId: dto.orderId, status: 'PENDING_MERCHANT' },
    });
    if (existing) {
      throw new BadRequestException({
        code: ErrorCode.DUPLICATE_REQUEST,
        message: 'a pending after-sale already exists for this order',
      });
    }

    const store = await this.storeRepo.findOne({ where: { storeId: order.storeId } });
    if (!store) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'store not found' });

    const now = Date.now();
    const inserted = await this.afterSaleRepo.save(
      this.afterSaleRepo.create({
        orderId: dto.orderId,
        customerId,
        merchantId: store.merchantId,
        storeId: store.storeId,
        type: dto.type,
        reason: dto.reason,
        amountCents: String(dto.amountCents),
        status: 'PENDING_MERCHANT',
        appliedAt: String(now),
        createdAt: String(now),
        updatedAt: String(now),
      }),
    );

    if (dto.evidenceFileIds?.length) {
      for (const fileId of dto.evidenceFileIds) {
        await this.evidenceRepo.insert({
          afterSaleId: inserted.afterSaleId,
          fileId,
          source: 'USER',
          createdAt: String(now),
        });
      }
    }

    await this.eventBus.publish(
      EventName.AfterSaleApplied,
      {
        afterSaleId: inserted.afterSaleId,
        orderId: dto.orderId,
        storeId: store.storeId,
        merchantId: store.merchantId,
        customerId,
        amountCents: String(dto.amountCents),
        reason: dto.reason,
        appliedAt: now,
      },
      { bizType: 'after-sale', bizId: inserted.afterSaleId },
    );

    return { afterSaleId: inserted.afterSaleId, status: 'PENDING_MERCHANT', appliedAt: now };
  }
}
