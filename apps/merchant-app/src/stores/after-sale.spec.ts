import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/after-sales', () => ({
  listAfterSales: vi.fn(async () => ({
    code: '0',
    data: {
      items: [
        {
          afterSaleId: '700001',
          orderId: '510001',
          reason: '送错餐',
          amountCents: '5000',
          status: 'PENDING_MERCHANT',
          appliedAt: 1,
          createdAt: 1,
        },
      ],
      total: 1,
      pageNo: 1,
      pageSize: 50,
    },
  })),
  reviewAfterSale: vi.fn(async () => ({
    code: '0',
    data: { afterSaleId: '700001', status: 'APPROVED_BY_MERCHANT', nextHandler: 'PAYMENT' },
  })),
}));

import { useAfterSaleStore } from './after-sale';

describe('useAfterSaleStore', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('refresh 加载列表', async () => {
    const s = useAfterSaleStore();
    await s.refresh();
    expect(s.items.length).toBe(1);
  });

  it('review APPROVE 后从列表移除', async () => {
    const s = useAfterSaleStore();
    await s.refresh();
    const ok = await s.review('700001', 'APPROVE');
    expect(ok).toBe(true);
    expect(s.items.length).toBe(0);
  });

  it('review REJECT 带 rejectReason', async () => {
    const s = useAfterSaleStore();
    await s.refresh();
    const ok = await s.review('700001', 'REJECT', '无问题');
    expect(ok).toBe(true);
  });
});
