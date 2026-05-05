import { defineStore } from 'pinia';
import { ref } from 'vue';

import {
  acceptOrder,
  listPendingOrders,
  readyOrder,
  rejectOrder,
  type MerchantOrderListItemVo,
} from '@/api/merchant-orders';

export const useOrderStore = defineStore('merchant-order', () => {
  const pending = ref<MerchantOrderListItemVo[]>([]);
  const total = ref(0);
  const loading = ref(false);

  async function refresh(): Promise<void> {
    loading.value = true;
    try {
      const r = await listPendingOrders({ pageNo: 1, pageSize: 50 });
      if (r.code === '0' && r.data) {
        pending.value = r.data.items;
        total.value = r.data.total;
      }
    } finally {
      loading.value = false;
    }
  }

  async function accept(orderId: string, expectedReadyMinutes?: number): Promise<boolean> {
    const r = await acceptOrder(orderId, expectedReadyMinutes);
    if (r.code === '0') {
      pending.value = pending.value.filter((o) => o.orderId !== orderId);
      total.value = Math.max(0, total.value - 1);
      return true;
    }
    return false;
  }

  async function reject(orderId: string, reason: string): Promise<boolean> {
    const r = await rejectOrder(orderId, reason);
    if (r.code === '0') {
      pending.value = pending.value.filter((o) => o.orderId !== orderId);
      total.value = Math.max(0, total.value - 1);
      return true;
    }
    return false;
  }

  async function markReady(orderId: string, remark?: string): Promise<boolean> {
    const r = await readyOrder(orderId, remark);
    return r.code === '0';
  }

  return { pending, total, loading, refresh, accept, reject, markReady };
});
