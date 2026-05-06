import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RefundOrder, type RefundOrderBizType } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import type { AdminRefundItemVo, AdminRefundsListVo, AdminRefundsQueryDto } from './admin-refund.dto';

export interface CreateRefundInput {
  bizType: RefundOrderBizType;
  bizOrderId: string;
  paymentOrderId: string | null;
  amount: string;
  provider?: string;
}

@Injectable()
export class AdminRefundService {
  constructor(
    @InjectRepository(RefundOrder) private readonly repo: Repository<RefundOrder>,
    private readonly eventBus: DomainEventBus,
  ) {}

  /**
   * 由仲裁触发,创建退款单 + mock 执行 + emit RefundExecuted。
   * 真实接 wxpay 在 stage 11。
   */
  async createFromArbitration(input: CreateRefundInput): Promise<RefundOrder> {
    const now = Date.now();
    const refundNo = this.genRefundNo(now);
    const order = this.repo.create({
      refundNo,
      bizType: input.bizType,
      bizOrderId: input.bizOrderId,
      paymentOrderId: input.paymentOrderId,
      amount: input.amount,
      status: 'PENDING',
      provider: input.provider ?? 'wxpay',
      providerRefundId: null,
      errorMessage: null,
      createdAt: String(now),
      updatedAt: String(now),
    });
    const saved = await this.repo.save(order);

    // mock 执行(同步成功)
    saved.status = 'SUCCESS';
    saved.providerRefundId = `mock_${saved.refundOrderId}`;
    saved.updatedAt = String(Date.now());
    await this.repo.save(saved);

    await this.eventBus.publish(
      EventName.RefundExecuted,
      {
        refundOrderId: saved.refundOrderId,
        refundNo: saved.refundNo,
        bizType: saved.bizType,
        bizOrderId: saved.bizOrderId,
        amount: saved.amount,
        status: 'SUCCESS' as const,
        executedAt: Date.now(),
      },
      { bizType: 'refund', bizId: saved.refundOrderId },
    );
    return saved;
  }

  async list(query: AdminRefundsQueryDto): Promise<AdminRefundsListVo> {
    const pageNo = Math.max(1, query.pageNo ?? 1);
    const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 20));
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.bizType) where.bizType = query.bizType;
    if (query.bizOrderId) where.bizOrderId = query.bizOrderId;
    const [rows, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });
    return { items: rows.map((r) => this.toVo(r)), total, pageNo, pageSize };
  }

  async detail(refundOrderId: string): Promise<AdminRefundItemVo> {
    const r = await this.repo.findOne({ where: { refundOrderId } });
    if (!r) throw new NotFoundException('refund not found');
    return this.toVo(r);
  }

  private toVo(r: RefundOrder): AdminRefundItemVo {
    return {
      refundOrderId: r.refundOrderId,
      refundNo: r.refundNo,
      bizType: r.bizType,
      bizOrderId: r.bizOrderId,
      paymentOrderId: r.paymentOrderId,
      amount: r.amount,
      status: r.status,
      provider: r.provider,
      errorMessage: r.errorMessage,
      createdAt: Number(r.createdAt),
      updatedAt: Number(r.updatedAt),
    };
  }

  private genRefundNo(now: number): string {
    const d = new Date(now);
    const yyyymmdd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `RF${yyyymmdd}${String(now).slice(-6)}`;
  }
}
