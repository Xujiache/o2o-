<script setup lang="ts">
import { ref, watch } from 'vue';

import { type AdminDispatchDetailVo, getDispatchDetail } from '@/api/admin-dispatch';
import { formatDateTime } from '@/utils/format';

const props = defineProps<{ visible: boolean; dispatchTaskId: string | null }>();
const emit = defineEmits<{ 'update:visible': [boolean] }>();

const detail = ref<AdminDispatchDetailVo | null>(null);
const loading = ref(false);

async function load(): Promise<void> {
  if (!props.dispatchTaskId) return;
  loading.value = true;
  try {
    const r = await getDispatchDetail(props.dispatchTaskId);
    if (r.code === '0' && r.data) detail.value = r.data;
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.visible, props.dispatchTaskId],
  ([visible, id]) => {
    if (visible && id) void load();
  },
);

function close(): void {
  emit('update:visible', false);
}
</script>

<template>
  <el-drawer :model-value="visible" :before-close="close" title="派单详情" size="50%">
    <el-skeleton v-if="loading" :rows="6" animated />
    <el-descriptions v-else-if="detail" :column="2" border>
      <el-descriptions-item label="ID">{{ detail.dispatchTaskId }}</el-descriptions-item>
      <el-descriptions-item label="状态">{{ detail.status }}</el-descriptions-item>
      <el-descriptions-item label="业务类型">{{ detail.bizType }}</el-descriptions-item>
      <el-descriptions-item label="订单">{{ detail.bizOrderId }}</el-descriptions-item>
      <el-descriptions-item v-if="detail.bizTaskId" label="任务 ID">{{ detail.bizTaskId }}</el-descriptions-item>
      <el-descriptions-item label="接单骑手">{{ detail.acceptedRiderId ?? '--' }}</el-descriptions-item>
      <el-descriptions-item label="重试次数">{{ detail.retryCount }}</el-descriptions-item>
      <el-descriptions-item label="派单时间">{{ formatDateTime(detail.dispatchedAt) }}</el-descriptions-item>
      <el-descriptions-item label="超时时间">{{ formatDateTime(detail.timeoutAt) }}</el-descriptions-item>
      <el-descriptions-item label="完成时间">{{ formatDateTime(detail.completedAt) }}</el-descriptions-item>
      <el-descriptions-item label="候选骑手" :span="2">
        <span v-if="!detail.candidateRiderIds.length">无</span>
        <span v-for="r in detail.candidateRiderIds" :key="r" class="cand">{{ r }}</span>
      </el-descriptions-item>
    </el-descriptions>
  </el-drawer>
</template>

<style scoped>
.cand {
  display: inline-block;
  background: #f0f0f0;
  border-radius: 4px;
  padding: 2px 8px;
  margin-right: 8px;
}
</style>
