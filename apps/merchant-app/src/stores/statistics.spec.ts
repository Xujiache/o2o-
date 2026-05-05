import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/statistics', () => ({
  getStatistics: vi.fn(async () => ({
    code: '0',
    data: {
      range: 'TODAY',
      orderCount: 10,
      grossCents: '50000',
      refundCents: '0',
      netCents: '47500',
      storeRating: '4.50',
      topItems: [],
    },
  })),
}));

import { useStatisticsStore } from './statistics';

describe('useStatisticsStore', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('load 加载今日统计', async () => {
    const s = useStatisticsStore();
    await s.load();
    expect(s.data?.orderCount).toBe(10);
    expect(s.data?.netCents).toBe('47500');
  });
});
