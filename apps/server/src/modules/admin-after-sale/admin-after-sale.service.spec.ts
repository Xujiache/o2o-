import { NotFoundException } from '@nestjs/common';

import type { AfterSale, AfterSaleEvidence } from '../../database/entities';

import { AdminAfterSaleService } from './admin-after-sale.service';

interface World {
  afterSales: AfterSale[];
  evidences: AfterSaleEvidence[];
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const afterSaleRepo: any = {
    findOne: jest.fn(async (opt: any) => w.afterSales.find((a) => a.afterSaleId === opt.where.afterSaleId) ?? null),
    findAndCount: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      const matched = w.afterSales.filter((a) => {
        if (where.status && a.status !== where.status) return false;
        if (where.storeId && a.storeId !== where.storeId) return false;
        return true;
      });
      const skip = opt.skip ?? 0;
      const take = opt.take ?? matched.length;
      return [matched.slice(skip, skip + take), matched.length];
    }),
  };
  const evidenceRepo: any = {
    find: jest.fn(async (opt: any) => w.evidences.filter((e) => e.afterSaleId === opt.where.afterSaleId)),
  };
  const svc = new AdminAfterSaleService(afterSaleRepo, evidenceRepo);
  return { svc };
  /* eslint-enable */
}

describe('AdminAfterSaleService', () => {
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
          merchantReviewAt: null,
          merchantRejectReason: null,
          appliedAt: String(Date.now()),
          completedAt: null,
          createdAt: String(Date.now()),
        } as AfterSale,
      ],
      evidences: [
        {
          afterSaleEvidenceId: '1',
          afterSaleId: '700001',
          fileId: '9001',
          source: 'USER',
          createdAt: '0',
        } as AfterSaleEvidence,
      ],
    };
  });

  it('list 返回所有 + status 过滤', async () => {
    const { svc } = buildService(w);
    const r = await svc.list({});
    expect(r.total).toBe(1);
    const r2 = await svc.list({ status: 'COMPLETED' });
    expect(r2.total).toBe(0);
  });

  it('detail 包含 evidenceFileIds', async () => {
    const { svc } = buildService(w);
    const r = await svc.detail('700001');
    expect(r.evidenceFileIds).toEqual(['9001']);
  });

  it('detail 不存在抛 NotFound', async () => {
    const { svc } = buildService(w);
    await expect(svc.detail('999')).rejects.toThrow(NotFoundException);
  });
});
