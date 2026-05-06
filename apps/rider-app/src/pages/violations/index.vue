<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { listViolations, type ViolationItemVo } from '@/api/rider-violations';
import { fmtCents } from '@/utils/earning-formula';
import { STATUS_LABEL_VIOLATION } from '@/utils/rider-task-status';

const items = ref<ViolationItemVo[]>([]);
const loading = ref(false);

async function refresh(): Promise<void> {
  loading.value = true;
  try {
    const r = await listViolations({ pageNo: 1, pageSize: 50 });
    if (r.code === '0' && r.data) items.value = r.data.items;
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);
</script>

<template>
  <view class="v">
    <view v-if="loading" class="v__msg">加载中...</view>
    <view v-else-if="items.length === 0" class="v__msg">暂无违规记录</view>
    <view v-for="i in items" :key="i.violationId" class="v__card">
      <view class="v__row"
        ><text>{{ i.type }}</text
        ><text>{{ STATUS_LABEL_VIOLATION[i.status] || i.status }}</text></view
      >
      <view class="v__row sub">{{ i.description }}</view>
      <view v-if="i.deductCents" class="v__row"
        ><text>扣款</text><text>-¥{{ fmtCents(i.deductCents) }}</text></view
      >
    </view>
  </view>
</template>

<style scoped>
.v {
  padding-top: 16rpx;
  background: #f5f5f5;
  min-height: 100vh;
}
.v__msg {
  text-align: center;
  padding: 80rpx;
  color: #888;
}
.v__card {
  background: #fff;
  margin: 16rpx;
  border-radius: 12rpx;
  padding: 24rpx;
}
.v__row {
  display: flex;
  justify-content: space-between;
  padding: 6rpx 0;
}
.v__row.sub {
  color: #666;
  font-size: 24rpx;
  display: block;
}
</style>
