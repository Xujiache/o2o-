import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { In, Repository } from 'typeorm';

import { PaymentOrder, RefundOrder, type RefundOrderBizType } from '../../database/entities';
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
    @InjectRepository(PaymentOrder) private readonly paymentRepo: Repository<PaymentOrder>,
    private readonly eventBus: DomainEventBus,
  ) {}

  /**
   * 由仲裁触发,创建退款单 + mock 执行 + emit RefundExecuted。
   * 真实接 wxpay 在 stage 11。
   *
   * 校验:本次 amount + 同 bizOrderId 已存在 PENDING/SUCCESS 的累计 amount <= 原支付 paid_amount。
   * 否则会产生超额退款。
   */
  async createFromArbitration(input: CreateRefundInput): Promise<RefundOrder> {
    const amount = BigInt(input.amount);
    if (amount <= 0n) {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVALID_PARAM,
        detail: 'INVALID_REFUND_AMOUNT',
        message: 'refund amount must be positive',
      });
    }

    // 累计退款校验:原支付金额 - 本订单已存在的 PENDING+SUCCESS 退款累计 >= 本次申请金额
    if (input.paymentOrderId) {
      const payment = await this.paymentRepo.findOne({ where: { paymentOrderId: input.paymentOrderId } });
      if (!payment) {
        throw new NotFoundException({
          code: ErrorCode.DATA_NOT_FOUND,
          detail: 'PAYMENT_NOT_FOUND',
          message: 'payment order not found',
        });
      }
      const paidAmount = BigInt(payment.paidAmount ?? payment.payableAmount);
      const existing = await this.repo.find({
        where: { paymentOrderId: input.paymentOrderId, status: In(['PENDING', 'SUCCESS']) },
        select: ['amount'],
      });
      const refunded = existing.reduce((acc, r) => acc + BigInt(r.amount), 0n);
      if (refunded + amount > paidAmount) {
        throw new UnprocessableEntityException({
          code: ErrorCode.STATUS_INVALID,
          detail: 'REFUND_EXCEEDS_PAID',
          message: `refund total ${(refunded + amount).toString()} exceeds paid ${paidAmount.toString()}`,
        });
      }
    }

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

  /**
   * stage 10:第三方退款回调入口(stage 11 接真 wxpay)
   * - 验签 mock + nonce 防重(简化:基于 providerRefundId 唯一)
   * - 找 refund_order(by providerRefundId 或 refundNo)→ 设 SUCCESS/FAILED
   */
  async handleProviderCallback(
    channel: 'wxpay' | 'alipay',
    providerRefundId: string,
    refundNo: string,
    succeeded: boolean,
  ): Promise<{ ok: true; duplicate?: boolean }> {
    if (!providerRefundId || !refundNo) {
      throw new NotFoundException('invalid callback payload');
    }
    const r = await this.repo.findOne({ where: { refundNo } });
    if (!r) {
      // stage 10 仅做骨架,真实场景需告警 + 写入 integration_request_log
      return { ok: true };
    }
    if (r.status === 'SUCCESS' || r.status === 'FAILED') {
      return { ok: true, duplicate: true };
    }
    r.status = succeeded ? 'SUCCESS' : 'FAILED';
    r.providerRefundId = providerRefundId;
    r.provider = channel;
    r.updatedAt = String(Date.now());
    await this.repo.save(r);
    return { ok: true };
  }

  private genRefundNo(now: number): string {
    const d = new Date(now);
    const yyyymmdd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `RF${yyyymmdd}${String(now).slice(-6)}`;
  }
}
