<script setup lang="ts">
import { ref, watch } from 'vue';

import { type AdminAfterSaleDetailVo, getAfterSaleDetail } from '@/api/admin-after-sales';

const props = defineProps<{ visible: boolean; afterSaleId: string | null }>();
const emit = defineEmits<{ 'update:visible': [boolean] }>();

const detail = ref<AdminAfterSaleDetailVo | null>(null);
const loading = ref(false);

async function load(): Promise<void> {
  if (!props.afterSaleId) return;
  loading.value = true;
  try {
    const r = await getAfterSaleDetail(props.afterSaleId);
    if (r.code === '0' && r.data) detail.value = r.data;
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.visible, props.afterSaleId],
  ([v, id]) => {
    if (v && id) void load();
  },
);

function fmt(cents: string): string {
  return (Number(cents) / 100).toFixed(2);
}

function fmtTime(ms: number | null): string {
  return ms ? new Date(ms).toLocaleString() : '-';
}

function close(): void {
  emit('update:visible', false);
}
</script>

<template>
  <el-drawer :model-value="visible" :before-close="close" title="售后单详情" size="50%">
    <el-skeleton v-if="loading" :rows="6" animated />
    <el-descriptions v-else-if="detail" :column="2" border>
      <el-descriptions-item label="ID">{{ detail.afterSaleId }}</el-descriptions-item>
      <el-descriptions-item label="订单">{{ detail.orderId }}</el-descriptions-item>
      <el-descriptions-item label="店铺">{{ detail.storeId }}</el-descriptions-item>
      <el-descriptions-item label="商家">{{ detail.merchantId }}</el-descriptions-item>
      <el-descriptions-item label="用户">{{ detail.customerId }}</el-descriptions-item>
      <el-descriptions-item label="类型">{{ detail.type }}</el-descriptions-item>
      <el-descriptions-item label="金额">¥{{ fmt(detail.amountCents) }}</el-descriptions-item>
      <el-descriptions-item label="状态">{{ detail.status }}</el-descriptions-item>
      <el-descriptions-item label="原因" :span="2">{{ detail.reason }}</el-descriptions-item>
      <el-descriptions-item v-if="detail.merchantRejectReason" label="驳回原因" :span="2">
        {{ detail.merchantRejectReason }}
      </el-descriptions-item>
      <el-descriptions-item label="申请时间">{{ fmtTime(detail.appliedAt) }}</el-descriptions-item>
      <el-descriptions-item label="商家审核时间">{{ fmtTime(detail.merchantReviewAt) }}</el-descriptions-item>
      <el-descriptions-item label="完成时间">{{ fmtTime(detail.completedAt) }}</el-descriptions-item>
      <el-descriptions-item label="凭证文件" :span="2">
        <span v-if="!detail.evidenceFileIds.length">无</span>
        <span v-for="f in detail.evidenceFileIds" :key="f" class="file-tag">{{ f }}</span>
      </el-descriptions-item>
    </el-descriptions>
  </el-drawer>
</template>

<style scoped>
.file-tag {
  display: inline-block;
  background: #f0f0f0;
  border-radius: 4px;
  padding: 2px 8px;
  margin-right: 8px;
}
</style>
