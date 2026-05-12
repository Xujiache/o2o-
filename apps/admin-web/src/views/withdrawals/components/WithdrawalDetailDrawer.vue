<script setup lang="ts">
import { ref, watch } from 'vue';

import { type AdminWithdrawalListItemVo, getWithdrawalDetail } from '@/api/admin-withdrawals';
import { formatDateTime, formatYuan } from '@/utils/format';

const props = defineProps<{ visible: boolean; withdrawalId: string | null }>();
const emit = defineEmits<{ 'update:visible': [boolean] }>();

const detail = ref<AdminWithdrawalListItemVo | null>(null);
const loading = ref(false);

async function load(): Promise<void> {
  if (!props.withdrawalId) return;
  loading.value = true;
  try {
    const r = await getWithdrawalDetail(props.withdrawalId);
    if (r.code === '0' && r.data) detail.value = r.data;
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.visible, props.withdrawalId],
  ([visible, id]) => {
    if (visible && id) void load();
  },
);

function close(): void {
  emit('update:visible', false);
}
</script>

<template>
  <el-drawer :model-value="visible" :before-close="close" title="提现单详情" size="50%">
    <el-skeleton v-if="loading" :rows="6" animated />
    <el-descriptions v-else-if="detail" :column="2" border>
      <el-descriptions-item label="提现单号" :span="2">{{ detail.withdrawalNo }}</el-descriptions-item>
      <el-descriptions-item label="店铺">{{ detail.storeId }}</el-descriptions-item>
      <el-descriptions-item label="商家">{{ detail.merchantId }}</el-descriptions-item>
      <el-descriptions-item label="金额（元）">{{ formatYuan(detail.amountCents) }}</el-descriptions-item>
      <el-descriptions-item label="状态">{{ detail.status }}</el-descriptions-item>
      <el-descriptions-item label="提交时间">{{ formatDateTime(detail.submittedAt) }}</el-descriptions-item>
      <el-descriptions-item label="完成时间">{{ formatDateTime(detail.completedAt) }}</el-descriptions-item>
      <el-descriptions-item v-if="detail.failReason" label="失败原因" :span="2">
        {{ detail.failReason }}
      </el-descriptions-item>
    </el-descriptions>
  </el-drawer>
</template>
