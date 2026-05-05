import { defineStore } from 'pinia';
import { ref } from 'vue';

import { listSettlements, type SettlementListItemVo } from '@/api/settlements';
import { createWithdrawal, listWithdrawals, type WithdrawalListItemVo } from '@/api/withdrawals';

export const useSettlementStore = defineStore('merchant-settlement', () => {
  const settlements = ref<SettlementListItemVo[]>([]);
  const withdrawals = ref<WithdrawalListItemVo[]>([]);
  const loading = ref(false);

  async function refreshSettlements(month?: string): Promise<void> {
    loading.value = true;
    try {
      const r = await listSettlements({ month, pageNo: 1, pageSize: 50 });
      if (r.code === '0' && r.data) settlements.value = r.data.items;
    } finally {
      loading.value = false;
    }
  }

  async function refreshWithdrawals(): Promise<void> {
    loading.value = true;
    try {
      const r = await listWithdrawals({ pageNo: 1, pageSize: 50 });
      if (r.code === '0' && r.data) withdrawals.value = r.data.items;
    } finally {
      loading.value = false;
    }
  }

  async function submitWithdrawal(amountCents: number, smsCode: string): Promise<boolean> {
    const r = await createWithdrawal({ amountCents, smsCode });
    if (r.code === '0') {
      await refreshWithdrawals();
      return true;
    }
    return false;
  }

  return { settlements, withdrawals, loading, refreshSettlements, refreshWithdrawals, submitWithdrawal };
});
