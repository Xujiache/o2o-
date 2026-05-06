import { defineStore } from 'pinia';
import { ref } from 'vue';

import { getEarnings, type EarningSummaryVo } from '@/api/rider-earnings';

export const useEarningStore = defineStore('rider-earning', () => {
  const data = ref<EarningSummaryVo | null>(null);
  const loading = ref(false);

  async function load(params?: { fromDate?: number; toDate?: number }): Promise<void> {
    loading.value = true;
    try {
      const r = await getEarnings({ ...params, pageNo: 1, pageSize: 30 });
      if (r.code === '0' && r.data) data.value = r.data;
    } finally {
      loading.value = false;
    }
  }

  return { data, loading, load };
});
