import { defineStore } from 'pinia';
import { ref } from 'vue';

import { getStatistics, type StatisticsVo } from '@/api/statistics';

export const useStatisticsStore = defineStore('merchant-statistics', () => {
  const data = ref<StatisticsVo | null>(null);
  const loading = ref(false);

  async function load(range: 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' = 'TODAY'): Promise<void> {
    loading.value = true;
    try {
      const r = await getStatistics(range);
      if (r.code === '0' && r.data) data.value = r.data;
    } finally {
      loading.value = false;
    }
  }

  return { data, loading, load };
});
