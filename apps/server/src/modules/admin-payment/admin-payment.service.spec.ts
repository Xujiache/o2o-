import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { PaymentOrder } from '../../database/entities';

import { AdminPaymentService } from './admin-payment.service';

const PID = 'P1';

async function build(repo: { findOne: jest.Mock }) {
  const m = await Test.createTestingModule({
    providers: [AdminPaymentService, { provide: getRepositoryToken(PaymentOrder), useValue: repo }],
  }).compile();
  return m.get(AdminPaymentService);
}

describe('AdminPaymentService', () => {
  it('found:含 callbackLogs', async () => {
    const repo = {
      findOne: jest.fn(async () => ({
        paymentOrderId: PID,
        status: 'success',
        paidAt: '99',
        paidAmount: '9900',
        payableAmount: '9900',
        payChannel: 'wxpay',
        channelTradeNo: 'wx_x',
        callbackRaw: { rawBody: '{}', parsedAt: 99 },
      })),
    };
    const svc = await build(repo);
    const r = await svc.getOne(PID);
    expect(r.payStatus).toBe('success');
    expect(r.callbackLogs).toHaveLength(1);
    expect(r.callbackLogs[0]?.parsedAt).toBe(99);
  });

  it('not found', async () => {
    const repo = { findOne: jest.fn(async () => null) };
    const svc = await build(repo);
    await expect(svc.getOne(PID)).rejects.toThrow(NotFoundException);
  });
});
