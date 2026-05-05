import { defineStore } from 'pinia';
import { ref } from 'vue';

import { listAfterSales, reviewAfterSale, type MerchantAfterSaleListItemVo } from '@/api/after-sales';

export const useAfterSaleStore = defineStore('merchant-after-sale', () => {
  const items = ref<MerchantAfterSaleListItemVo[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const filterStatus = ref<string | undefined>('PENDING_MERCHANT');

  async function refresh(): Promise<void> {
    loading.value = true;
    try {
      const r = await listAfterSales({ status: filterStatus.value, pageNo: 1, pageSize: 50 });
      if (r.code === '0' && r.data) {
        items.value = r.data.items;
        total.value = r.data.total;
      }
    } finally {
      loading.value = false;
    }
  }

  async function review(afterSaleId: string, decision: 'APPROVE' | 'REJECT', rejectReason?: string): Promise<boolean> {
    const r = await reviewAfterSale(afterSaleId, { reviewResult: decision, rejectReason });
    if (r.code === '0') {
      items.value = items.value.filter((a) => a.afterSaleId !== afterSaleId);
      total.value = Math.max(0, total.value - 1);
      return true;
    }
    return false;
  }

  return { items, total, loading, filterStatus, refresh, review };
});
