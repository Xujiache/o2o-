import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/admin-cities', () => ({
  listCities: vi.fn(async () => ({
    code: '0',
    data: { pageNo: 1, pageSize: 200, total: 1, list: [{ cityCode: 'BJ', cityName: '北京', serviceEnabled: true }] },
  })),
}));

vi.mock('@/api/admin-categories', () => ({
  listCategoryTree: vi.fn(async () => ({
    code: '0',
    data: { bizType: 'takeaway', list: [{ categoryId: '1', name: '快餐', enabled: true }] },
  })),
}));

vi.mock('@/api/admin-roles', () => ({
  listPermissions: vi.fn(async () => ({
    code: '0',
    data: { groups: [{ group: 'admin', permissions: [{ code: 'a', name: 'a' }] }] },
  })),
}));

import { useDictStore } from './dict';

describe('dict store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('auditStatusLabel / accountStatusLabel / operatorTypeLabel', () => {
    const s = useDictStore();
    expect(s.auditStatusLabel('pending')).toBe('待审核');
    expect(s.accountStatusLabel('disabled')).toBe('已禁用');
    expect(s.operatorTypeLabel('admin')).toBe('管理员');
    expect(s.auditStatusLabel('unknown')).toBe('unknown');
  });

  it('loadCities 缓存 60s', async () => {
    const s = useDictStore();
    const r1 = await s.loadCities();
    expect(r1).toHaveLength(1);
    const r2 = await s.loadCities();
    expect(r2).toStrictEqual(r1);
    expect(s.cities).not.toBeNull();
  });

  it('loadCategories takeaway / errand 各自缓存', async () => {
    const s = useDictStore();
    const t1 = await s.loadCategories('takeaway');
    expect(t1).toHaveLength(1);
    expect(s.takeawayCategories).not.toBeNull();
  });

  it('loadPermissionTree 缓存', async () => {
    const s = useDictStore();
    const r = await s.loadPermissionTree();
    expect(r.groups).toHaveLength(1);
  });
});
