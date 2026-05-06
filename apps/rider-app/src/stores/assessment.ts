import { defineStore } from 'pinia';
import { ref } from 'vue';

import { getAssessment, type AssessmentVo } from '@/api/rider-assessment';

export const useAssessmentStore = defineStore('rider-assessment', () => {
  const data = ref<AssessmentVo | null>(null);
  const loading = ref(false);

  async function load(period?: number): Promise<void> {
    loading.value = true;
    try {
      const r = await getAssessment(period);
      if (r.code === '0' && r.data) data.value = r.data;
    } finally {
      loading.value = false;
    }
  }

  return { data, loading, load };
});
