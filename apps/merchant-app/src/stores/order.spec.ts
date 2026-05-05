import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/merchant-orders', () => ({
  listPendingOrders: vi.fn(async () => ({
    code: '0',
    data: {
      items: [
        {
          orderId: '510001',
          orderNo: 'F1',
          status: 'PAID_WAIT_MERCHANT',
          payableAmountCents: '5000',
          userRemark: null,
          createdAt: 1,
          acceptDeadline: 2,
        },
      ],
      total: 1,
      pageNo: 1,
      pageSize: 50,
    },
  })),
  acceptOrder: vi.fn(async () => ({ code: '0', data: { orderId: '510001', status: 'PREPARING' } })),
  rejectOrder: vi.fn(async () => ({ code: '0', data: { orderId: '510001', status: 'CANCELLED' } })),
  readyOrder: vi.fn(async () => ({ code: '0', data: { orderId: '510001', status: 'READY_FOR_PICKUP' } })),
}));

import { useOrderStore } from './order';

describe('useOrderStore', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('refresh 加载 pending 列表', async () => {
    const s = useOrderStore();
    await s.refresh();
    expect(s.pending.length).toBe(1);
    expect(s.total).toBe(1);
  });

  it('accept 后从列表移除', async () => {
    const s = useOrderStore();
    await s.refresh();
    const ok = await s.accept('510001');
    expect(ok).toBe(true);
    expect(s.pending.length).toBe(0);
  });

  it('reject 后从列表移除', async () => {
    const s = useOrderStore();
    await s.refresh();
    const ok = await s.reject('510001', 'no stock');
    expect(ok).toBe(true);
    expect(s.pending.length).toBe(0);
  });

  it('markReady 调用 readyOrder', async () => {
    const s = useOrderStore();
    const ok = await s.markReady('510001');
    expect(ok).toBe(true);
  });
});
