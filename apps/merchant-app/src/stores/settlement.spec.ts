import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/settlements', () => ({
  listSettlements: vi.fn(async () => ({
    code: '0',
    data: {
      items: [
        {
          settlementId: '900001',
          settlementNo: 'S1',
          periodStart: 0,
          periodEnd: 1,
          grossCents: '50000',
          commissionCents: '2500',
          feeCents: '300',
          netCents: '47200',
          orderCount: 10,
          status: 'PENDING',
          createdAt: 1,
        },
      ],
      total: 1,
      pageNo: 1,
      pageSize: 50,
    },
  })),
}));

vi.mock('@/api/withdrawals', () => ({
  listWithdrawals: vi.fn(async () => ({
    code: '0',
    data: {
      items: [
        {
          withdrawalId: 'A1',
          withdrawalNo: 'W1',
          amountCents: '10000',
          status: 'PENDING',
          submittedAt: 1,
          completedAt: null,
          failReason: null,
        },
      ],
      total: 1,
      pageNo: 1,
      pageSize: 50,
    },
  })),
  createWithdrawal: vi.fn(async () => ({
    code: '0',
    data: { withdrawalId: 'A2', withdrawalNo: 'W2', status: 'PENDING', submittedAt: 1 },
  })),
}));

import { useSettlementStore } from './settlement';

describe('useSettlementStore', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('refreshSettlements 加载结算单', async () => {
    const s = useSettlementStore();
    await s.refreshSettlements();
    expect(s.settlements.length).toBe(1);
    expect(s.settlements[0]?.netCents).toBe('47200');
  });

  it('refreshWithdrawals 加载提现记录', async () => {
    const s = useSettlementStore();
    await s.refreshWithdrawals();
    expect(s.withdrawals.length).toBe(1);
  });

  it('submitWithdrawal 调用 create + 刷新', async () => {
    const s = useSettlementStore();
    const ok = await s.submitWithdrawal(100000, '123456');
    expect(ok).toBe(true);
    expect(s.withdrawals.length).toBeGreaterThan(0);
  });
});
