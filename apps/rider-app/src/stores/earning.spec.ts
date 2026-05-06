import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/rider-earnings', () => ({
  getEarnings: vi.fn(async () => ({
    code: '0',
    data: {
      totalIncome: '15000',
      orderCount: 10,
      rewardAmount: '500',
      deductAmount: '0',
      items: [],
      pageNo: 1,
      pageSize: 30,
    },
  })),
}));

import { useEarningStore } from './earning';

describe('useEarningStore', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('load', async () => {
    const s = useEarningStore();
    await s.load();
    expect(s.data?.totalIncome).toBe('15000');
    expect(s.data?.orderCount).toBe(10);
  });
});
