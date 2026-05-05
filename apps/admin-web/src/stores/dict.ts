/**
 * dictStore — 平台 Web 字典缓存(stage 4)
 * 用于:城市下拉、类目筛选、状态映射中文等。每个 key 60s 内复用上次结果。
 */
import { defineStore } from 'pinia';

import { listCategoryTree, type CategoryItemVo, type CategoryBizType } from '@/api/admin-categories';
import { listCities, type CityItemVo } from '@/api/admin-cities';
import { listPermissions, type PermissionTreeVo } from '@/api/admin-roles';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface State {
  cities: CacheEntry<CityItemVo[]> | null;
  takeawayCategories: CacheEntry<CategoryItemVo[]> | null;
  errandCategories: CacheEntry<CategoryItemVo[]> | null;
  permissionTree: CacheEntry<PermissionTreeVo> | null;
}

const TTL_MS = 60_000;

const AUDIT_STATUS_LABELS: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  disabled: '已禁用',
};
const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  active: '正常',
  disabled: '已禁用',
};
const OPERATOR_TYPE_LABELS: Record<string, string> = {
  customer: '用户',
  merchant: '商家',
  rider: '骑手',
  admin: '管理员',
  system: '系统',
};

function fresh<T>(c: CacheEntry<T> | null): T | null {
  if (!c) return null;
  return Date.now() < c.expiresAt ? c.data : null;
}

export const useDictStore = defineStore('dict', {
  state: (): State => ({
    cities: null,
    takeawayCategories: null,
    errandCategories: null,
    permissionTree: null,
  }),
  getters: {
    auditStatusLabel:
      () =>
      (status: string): string =>
        AUDIT_STATUS_LABELS[status] ?? status,
    accountStatusLabel:
      () =>
      (status: string): string =>
        ACCOUNT_STATUS_LABELS[status] ?? status,
    operatorTypeLabel:
      () =>
      (type: string): string =>
        OPERATOR_TYPE_LABELS[type] ?? type,
  },
  actions: {
    async loadCities(force = false): Promise<CityItemVo[]> {
      const cached = !force ? fresh(this.cities) : null;
      if (cached) return cached;
      const r = await listCities({ pageSize: 200 });
      const data = r.code === '0' ? r.data!.list : [];
      this.cities = { data, expiresAt: Date.now() + TTL_MS };
      return data;
    },
    async loadCategories(bizType: CategoryBizType, force = false): Promise<CategoryItemVo[]> {
      const slot = bizType === 'takeaway' ? 'takeawayCategories' : 'errandCategories';
      const cached = !force ? fresh(this[slot]) : null;
      if (cached) return cached;
      const r = await listCategoryTree(bizType);
      const data = r.code === '0' ? r.data!.list : [];
      this[slot] = { data, expiresAt: Date.now() + TTL_MS };
      return data;
    },
    async loadPermissionTree(force = false): Promise<PermissionTreeVo> {
      const cached = !force ? fresh(this.permissionTree) : null;
      if (cached) return cached;
      const r = await listPermissions();
      const data: PermissionTreeVo = r.code === '0' ? r.data! : { groups: [] };
      this.permissionTree = { data, expiresAt: Date.now() + TTL_MS };
      return data;
    },
  },
});
