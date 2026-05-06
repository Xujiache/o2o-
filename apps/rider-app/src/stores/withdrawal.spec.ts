import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/rider-withdrawals', () => ({
  listWithdrawals: vi.fn(async () => ({
    code: '0',
    data: {
      items: [
        {
          withdrawalId: '1',
          withdrawalNo: 'RW1',
          amountCents: '50000',
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
    data: { withdrawalId: '2', withdrawalNo: 'RW2', status: 'PENDING', submittedAt: 1 },
  })),
}));

import { useWithdrawalStore } from './withdrawal';

describe('useWithdrawalStore', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('refresh 加载提现记录', async () => {
    const s = useWithdrawalStore();
    await s.refresh();
    expect(s.items.length).toBe(1);
  });

  it('submit 调 create + 自动 refresh', async () => {
    const s = useWithdrawalStore();
    const ok = await s.submit({ amountCents: 50000, mobile: '138', smsCode: '123456' });
    expect(ok).toBe(true);
    expect(s.items.length).toBeGreaterThan(0);
  });
});
