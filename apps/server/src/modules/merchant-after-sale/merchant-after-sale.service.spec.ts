import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import type { AfterSale, AfterSaleEvidence, Store } from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';

import { MerchantAfterSaleService } from './merchant-after-sale.service';

interface World {
  afterSales: AfterSale[];
  evidences: AfterSaleEvidence[];
  stores: Store[];
  events: { name: string; payload: unknown }[];
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const afterSaleRepo: any = {
    findOne: jest.fn(async (opt: any) => w.afterSales.find((a) => a.afterSaleId === opt.where.afterSaleId) ?? null),
    findAndCount: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      const matched = w.afterSales.filter((a) => {
        if (where.storeId && a.storeId !== where.storeId) return false;
        if (where.status && a.status !== where.status) return false;
        return true;
      });
      const skip = opt.skip ?? 0;
      const take = opt.take ?? matched.length;
      return [matched.slice(skip, skip + take), matched.length];
    }),
    save: jest.fn(async (a: AfterSale) => a),
  };
  const evidenceRepo: any = {
    insert: jest.fn(async (row: any) => {
      w.evidences.push({ ...row, afterSaleEvidenceId: String(w.evidences.length + 1) });
    }),
  };
  const storeRepo: any = {
    findOne: jest.fn(async (opt: any) => w.stores.find((s) => s.merchantId === opt.where.merchantId) ?? null),
  };
  const eventBus = {
    publish: jest.fn(async (name: string, payload: unknown) => {
      w.events.push({ name, payload });
      return { eventId: 'e1' };
    }),
  } as unknown as DomainEventBus;

  const svc = new MerchantAfterSaleService(afterSaleRepo, evidenceRepo, storeRepo, eventBus);
  return { svc };
  /* eslint-enable */
}

describe('MerchantAfterSaleService', () => {
  let w: World;
  beforeEach(() => {
    w = {
      afterSales: [
        {
          afterSaleId: '700001',
          orderId: '510001',
          storeId: '20001',
          merchantId: '30001',
          customerId: '10001',
          type: 'REFUND',
          reason: '送错餐',
          amountCents: '5000',
          status: 'PENDING_MERCHANT',
          appliedAt: String(Date.now() - 60_000),
          createdAt: String(Date.now() - 60_000),
          updatedAt: String(Date.now()),
        } as AfterSale,
      ],
      evidences: [],
      stores: [{ storeId: '20001', merchantId: '30001' } as Store],
      events: [],
    };
  });

  it('list 返回商家自己的售后单', async () => {
    const { svc } = buildService(w);
    const r = await svc.list('30001', { pageNo: 1, pageSize: 20 });
    expect(r.total).toBe(1);
    expect(r.items[0]!.afterSaleId).toBe('700001');
  });

  it('list status 过滤生效', async () => {
    const { svc } = buildService(w);
    const r = await svc.list('30001', { status: 'COMPLETED' });
    expect(r.total).toBe(0);
  });

  it('approve → APPROVED_BY_MERCHANT + emit + nextHandler=PAYMENT', async () => {
    const { svc } = buildService(w);
    const r = await svc.review('30001', '700001', { reviewResult: 'APPROVE' });
    expect(r.status).toBe('APPROVED_BY_MERCHANT');
    expect(r.nextHandler).toBe('PAYMENT');
    expect(w.afterSales[0]!.status).toBe('APPROVED_BY_MERCHANT');
    expect(w.events[0]!.name).toBe('domain.after-sale.reviewed-by-merchant');
  });

  it('reject 必须有 rejectReason', async () => {
    const { svc } = buildService(w);
    await expect(svc.review('30001', '700001', { reviewResult: 'REJECT' })).rejects.toThrow(BadRequestException);
  });

  it('reject → REJECTED_BY_MERCHANT + nextHandler=PLATFORM', async () => {
    const { svc } = buildService(w);
    const r = await svc.review('30001', '700001', { reviewResult: 'REJECT', rejectReason: '商家反馈无问题' });
    expect(r.status).toBe('REJECTED_BY_MERCHANT');
    expect(r.nextHandler).toBe('PLATFORM');
    expect(w.afterSales[0]!.merchantRejectReason).toBe('商家反馈无问题');
  });

  it('已 APPROVED 抛 STATUS_INVALID', async () => {
    w.afterSales[0]!.status = 'APPROVED_BY_MERCHANT';
    const { svc } = buildService(w);
    await expect(svc.review('30001', '700001', { reviewResult: 'APPROVE' })).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('不归属本商家抛 FORBIDDEN', async () => {
    w.afterSales[0]!.storeId = '99999';
    const { svc } = buildService(w);
    await expect(svc.review('30001', '700001', { reviewResult: 'APPROVE' })).rejects.toThrow(ForbiddenException);
  });

  it('不存在抛 NotFound', async () => {
    const { svc } = buildService(w);
    await expect(svc.review('30001', '999', { reviewResult: 'APPROVE' })).rejects.toThrow(NotFoundException);
  });

  it('evidenceFileIds 写入 evidence 表', async () => {
    const { svc } = buildService(w);
    await svc.review('30001', '700001', { reviewResult: 'APPROVE', evidenceFileIds: ['9001', '9002'] });
    expect(w.evidences.length).toBe(2);
    expect(w.evidences[0]!.source).toBe('MERCHANT');
  });
});
