import { defineStore } from 'pinia';

import {
  getErrandOrderDetail,
  listErrandOrders,
  type ErrandOrderDetailVo,
  type ErrandOrderListItemVo,
  type ListStatusTab,
} from '@/api/errand-orders';

interface State {
  list: ErrandOrderListItemVo[];
  total: number;
  page: number;
  currentTab: ListStatusTab;
  detail: ErrandOrderDetailVo | null;
}

export const useErrandOrderStore = defineStore('errand-order', {
  state: (): State => ({
    list: [],
    total: 0,
    page: 1,
    currentTab: 'ALL',
    detail: null,
  }),
  actions: {
    async refresh(tab: ListStatusTab = 'ALL', page = 1, pageSize = 10): Promise<void> {
      const r = await listErrandOrders(tab, page, pageSize);
      if (r.code === '0' && r.data) {
        this.list = r.data.list;
        this.total = r.data.total;
        this.page = page;
        this.currentTab = tab;
      }
    },
    async loadDetail(orderId: string): Promise<ErrandOrderDetailVo | null> {
      const r = await getErrandOrderDetail(orderId);
      if (r.code === '0' && r.data) {
        this.detail = r.data;
        return r.data;
      }
      return null;
    },
    clearDetail(): void {
      this.detail = null;
    },
  },
});
