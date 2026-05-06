import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/rider-assessment', () => ({
  getAssessment: vi.fn(async () => ({
    code: '0',
    data: {
      period: 202605,
      onTimeRate: '0.9500',
      acceptRate: '0.8000',
      complaintRate: '0.0100',
      avgRating: '4.80',
      rankInCity: 5,
      badges: [],
    },
  })),
}));

import { useAssessmentStore } from './assessment';

describe('useAssessmentStore', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('load', async () => {
    const s = useAssessmentStore();
    await s.load();
    expect(s.data?.onTimeRate).toBe('0.9500');
  });
});
