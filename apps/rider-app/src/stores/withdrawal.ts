import { defineStore } from 'pinia';
import { ref } from 'vue';

import { createWithdrawal, listWithdrawals, type WithdrawalListItemVo } from '@/api/rider-withdrawals';

export const useWithdrawalStore = defineStore('rider-withdrawal', () => {
  const items = ref<WithdrawalListItemVo[]>([]);
  const loading = ref(false);

  async function refresh(): Promise<void> {
    loading.value = true;
    try {
      const r = await listWithdrawals({ pageNo: 1, pageSize: 50 });
      if (r.code === '0' && r.data) items.value = r.data.items;
    } finally {
      loading.value = false;
    }
  }

  async function submit(body: { amountCents: number; mobile: string; smsCode: string }): Promise<boolean> {
    const r = await createWithdrawal(body);
    if (r.code === '0') {
      await refresh();
      return true;
    }
    return false;
  }

  return { items, loading, refresh, submit };
});
