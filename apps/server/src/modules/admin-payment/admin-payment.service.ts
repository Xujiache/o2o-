import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { PaymentOrder } from '../../database/entities';

import type { AdminPaymentVo } from './admin-payment.dto';

@Injectable()
export class AdminPaymentService {
  constructor(@InjectRepository(PaymentOrder) private readonly repo: Repository<PaymentOrder>) {}

  async getOne(payOrderId: string): Promise<AdminPaymentVo> {
    const p = await this.repo.findOne({ where: { paymentOrderId: payOrderId } });
    if (!p) {
      throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'pay order not found' });
    }
    return {
      payOrderId: p.paymentOrderId,
      payStatus: p.status,
      paidAt: p.paidAt ? Number(p.paidAt) : null,
      amountFen: p.paidAmount ?? p.payableAmount,
      channel: p.payChannel,
      thirdPartyTradeNo: p.channelTradeNo,
      callbackLogs: p.callbackRaw
        ? [{ raw: p.callbackRaw.rawBody ?? null, parsedAt: p.callbackRaw.parsedAt ?? null }]
        : [],
    };
  }
}
