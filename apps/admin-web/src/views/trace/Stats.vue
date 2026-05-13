<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { type BatchStatsVo, getBatchStats } from '@/api/admin-trace';
import PageContainer from '@/components/PageContainer.vue';
import StatCard from '@/components/StatCard.vue';

const route = useRoute();
const router = useRouter();
const batchIdInput = ref<string>(String(route.query.batchId ?? ''));
const stats = ref<BatchStatsVo | null>(null);
const loading = ref(false);

const uniqueRatio = computed<string>(() => {
  if (!stats.value || stats.value.totalScans === 0) return '0%';
  const r = (stats.value.uniqueQrScanned / stats.value.totalScans) * 100;
  return `${r.toFixed(1)}%`;
});

async function fetchStats(): Promise<void> {
  const id = batchIdInput.value.trim();
  if (!id) {
    ElMessage.warning('请输入批次 ID');
    return;
  }
  loading.value = true;
  try {
    const r = await getBatchStats(id);
    if (r.code === '0' && r.data) {
      stats.value = r.data;
      router.replace({ path: route.path, query: { batchId: id } });
    }
  } finally {
    loading.value = false;
  }
}

function onClear(): void {
  batchIdInput.value = '';
  stats.value = null;
  router.replace({ path: route.path });
}

watch(
  () => route.query.batchId,
  (v) => {
    if (typeof v === 'string' && v && v !== batchIdInput.value) {
      batchIdInput.value = v;
      void fetchStats();
    }
  },
);

onMounted(() => {
  if (batchIdInput.value) void fetchStats();
});
</script>

<template>
  <PageContainer title="扫码统计" subtitle="按批次维度展示总扫码数 / 不重复 QR 扫码数">
    <section class="card-surface filter-panel">
      <span class="label">批次 ID</span>
      <el-input
        v-model="batchIdInput"
        placeholder="traceBatchId"
        clearable
        style="width: 320px"
        @keyup.enter="fetchStats"
      />
      <el-button type="primary" :loading="loading" @click="fetchStats">查询</el-button>
      <el-button @click="onClear">清空</el-button>
    </section>

    <section v-if="stats" class="stat-grid">
      <StatCard label="批次号" :value="stats.batchNo" tone="brand" />
      <StatCard label="总扫码数" :value="stats.totalScans" unit="次" tone="info" />
      <StatCard label="不重复 QR 扫码数" :value="stats.uniqueQrScanned" unit="个" tone="success" />
      <StatCard label="去重率" :value="uniqueRatio" tone="warning" hint="uniqueQrScanned / totalScans" />
    </section>

    <section v-else class="card-surface empty-panel">
      <div class="empty">输入批次 ID 后点击查询</div>
    </section>
  </PageContainer>
</template>

<style scoped>
.filter-panel {
  padding: var(--gap-4);
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.label {
  font-size: 13px;
  color: var(--fg-secondary);
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap-4);
}
.empty-panel {
  padding: var(--gap-4);
}
.empty {
  text-align: center;
  color: var(--fg-muted);
  padding: 32px 0;
  font-size: 13px;
}
</style>
