<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { request } from '@/utils/request';
import { acceptTask } from '@/api/rider-tasks';

interface AvailableTask {
  taskId: string;
  bizType: 'FOOD' | 'ERRAND';
  orderId: string;
  payable?: string;
  distance?: number;
}

const tasks = ref<AvailableTask[]>([]);
const loading = ref(false);

async function refresh(): Promise<void> {
  loading.value = true;
  try {
    const r = await request({ url: '/api/v1/r/tasks/available', method: 'GET' });
    if (r.code === '0' && r.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tasks.value = ((r.data as any).items ?? (r.data as any).list ?? []) as AvailableTask[];
    }
  } finally {
    loading.value = false;
  }
}

async function accept(taskId: string): Promise<void> {
  const r = await acceptTask(taskId);
  if (r.code === '0') {
    uni.showToast({ title: '已接单', icon: 'success' });
    setTimeout(() => uni.redirectTo({ url: '/pages/tasks/current' }), 600);
  } else {
    uni.showToast({ title: r.message ?? '抢单失败', icon: 'none' });
  }
}

onMounted(refresh);
</script>

<template>
  <view class="hall">
    <view class="hall__head">
      <text>接单大厅 ({{ tasks.length }})</text>
      <text class="hall__refresh" @tap="refresh">刷新</text>
    </view>
    <view v-if="loading" class="hall__msg">加载中...</view>
    <view v-else-if="tasks.length === 0" class="hall__msg">暂无可接订单</view>
    <view v-for="t in tasks" :key="t.taskId" class="hall__card">
      <view class="hall__row">
        <text>{{ t.bizType === 'FOOD' ? '外卖' : '跑腿' }}</text>
        <text class="hall__order">{{ t.orderId }}</text>
      </view>
      <button type="primary" size="mini" @tap="accept(t.taskId)">抢单</button>
    </view>
  </view>
</template>

<style scoped>
.hall {
  background: #f5f5f5;
  min-height: 100vh;
}
.hall__head {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  background: #fff;
}
.hall__refresh {
  color: #4c84ff;
}
.hall__msg {
  text-align: center;
  padding: 80rpx;
  color: #888;
}
.hall__card {
  background: #fff;
  margin: 16rpx;
  border-radius: 12rpx;
  padding: 24rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.hall__row {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.hall__order {
  font-size: 22rpx;
  color: #888;
}
</style>
