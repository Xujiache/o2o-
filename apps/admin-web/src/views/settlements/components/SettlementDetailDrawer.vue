<script setup lang="ts">
import { ref, watch } from 'vue';

import { type AdminSettlementListItemVo, getSettlementDetail } from '@/api/admin-settlements';
import { formatDate, formatDateTime, formatYuan } from '@/utils/format';

const props = defineProps<{ visible: boolean; settlementId: string | null }>();
const emit = defineEmits<{ 'update:visible': [boolean] }>();

const detail = ref<AdminSettlementListItemVo | null>(null);
const loading = ref(false);

async function load(): Promise<void> {
  if (!props.settlementId) return;
  loading.value = true;
  try {
    const r = await getSettlementDetail(props.settlementId);
    if (r.code === '0' && r.data) detail.value = r.data;
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.visible, props.settlementId],
  ([visible, id]) => {
    if (visible && id) void load();
  },
);

function close(): void {
  emit('update:visible', false);
}
</script>

<template>
  <el-drawer :model-value="visible" :before-close="close" title="结算单详情" size="50%">
    <el-skeleton v-if="loading" :rows="6" animated />
    <el-descriptions v-else-if="detail" :column="2" border>
      <el-descriptions-item label="结算单号" :span="2">{{ detail.settlementNo }}</el-descriptions-item>
      <el-descriptions-item label="店铺">{{ detail.storeId }}</el-descriptions-item>
      <el-descriptions-item label="商家">{{ detail.merchantId }}</el-descriptions-item>
      <el-descriptions-item label="周期" :span="2">
        {{ formatDate(detail.periodStart) }} ~ {{ formatDate(detail.periodEnd) }}
      </el-descriptions-item>
      <el-descriptions-item label="毛收入（元）">{{ formatYuan(detail.grossCents) }}</el-descriptions-item>
      <el-descriptions-item label="佣金（元）">{{ formatYuan(detail.commissionCents) }}</el-descriptions-item>
      <el-descriptions-item label="通道费（元）">{{ formatYuan(detail.feeCents) }}</el-descriptions-item>
      <el-descriptions-item label="实结（元）">{{ formatYuan(detail.netCents) }}</el-descriptions-item>
      <el-descriptions-item label="订单数">{{ detail.orderCount }}</el-descriptions-item>
      <el-descriptions-item label="退款数">{{ detail.refundCount }}</el-descriptions-item>
      <el-descriptions-item label="状态">{{ detail.status }}</el-descriptions-item>
      <el-descriptions-item label="完成时间">{{ formatDateTime(detail.completedAt) }}</el-descriptions-item>
    </el-descriptions>
  </el-drawer>
</template>
