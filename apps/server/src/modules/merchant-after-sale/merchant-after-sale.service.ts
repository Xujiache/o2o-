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

import { AfterSale, AfterSaleEvidence, Store } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import type {
  MerchantAfterSaleListItemVo,
  MerchantAfterSaleListVo,
  MerchantAfterSaleQueryDto,
  ReviewAfterSaleDto,
  ReviewAfterSaleVo,
} from './merchant-after-sale.dto';

@Injectable()
export class MerchantAfterSaleService {
  constructor(
    @InjectRepository(AfterSale) private readonly afterSaleRepo: Repository<AfterSale>,
    @InjectRepository(AfterSaleEvidence)
    private readonly evidenceRepo: Repository<AfterSaleEvidence>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    private readonly eventBus: DomainEventBus,
  ) {}

  private async resolveStoreOrThrow(merchantId: string): Promise<Store> {
    const store = await this.storeRepo.findOne({ where: { merchantId } });
    if (!store) throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'merchant has no store' });
    return store;
  }

  async list(merchantId: string, query: MerchantAfterSaleQueryDto): Promise<MerchantAfterSaleListVo> {
    const store = await this.resolveStoreOrThrow(merchantId);
    const pageNo = Math.max(1, query.pageNo ?? 1);
    const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 20));

    const where: Record<string, unknown> = { storeId: store.storeId };
    if (query.status) where.status = query.status;

    const [rows, total] = await this.afterSaleRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });

    const items: MerchantAfterSaleListItemVo[] = rows.map((r) => ({
      afterSaleId: r.afterSaleId,
      orderId: r.orderId,
      reason: r.reason,
      amountCents: r.amountCents,
      status: r.status,
      appliedAt: Number(r.appliedAt),
      createdAt: Number(r.createdAt),
    }));

    return { items, total, pageNo, pageSize };
  }

  async review(merchantId: string, afterSaleId: string, dto: ReviewAfterSaleDto): Promise<ReviewAfterSaleVo> {
    const store = await this.resolveStoreOrThrow(merchantId);
    const a = await this.afterSaleRepo.findOne({ where: { afterSaleId } });
    if (!a) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'after-sale not found' });
    if (a.storeId !== store.storeId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'not your after-sale' });
    }
    if (a.status !== 'PENDING_MERCHANT') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: `cannot review at status ${a.status}`,
      });
    }
    if (dto.reviewResult === 'REJECT' && (!dto.rejectReason || dto.rejectReason.trim().length === 0)) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_PARAM,
        message: 'rejectReason required when REJECT',
      });
    }

    const now = Date.now();
    if (dto.reviewResult === 'APPROVE') {
      a.status = 'APPROVED_BY_MERCHANT';
    } else {
      a.status = 'REJECTED_BY_MERCHANT';
      a.merchantRejectReason = dto.rejectReason ?? null;
    }
    a.merchantReviewAt = String(now);
    a.updatedAt = String(now);
    await this.afterSaleRepo.save(a);

    if (dto.evidenceFileIds?.length) {
      for (const fileId of dto.evidenceFileIds) {
        await this.evidenceRepo.insert({
          afterSaleId: a.afterSaleId,
          fileId,
          source: 'MERCHANT',
          createdAt: String(now),
        });
      }
    }

    await this.eventBus.publish(
      EventName.AfterSaleReviewedByMerchant,
      {
        afterSaleId: a.afterSaleId,
        orderId: a.orderId,
        storeId: a.storeId,
        decision: dto.reviewResult,
        rejectReason: dto.rejectReason ?? null,
        reviewedAt: now,
      },
      { bizType: 'after-sale', bizId: a.afterSaleId },
    );

    const nextHandler = dto.reviewResult === 'APPROVE' ? 'PAYMENT' : 'PLATFORM';
    return { afterSaleId: a.afterSaleId, status: a.status, nextHandler };
  }
}
