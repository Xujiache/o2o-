<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { getAvailableTasks, type TaskItemVo } from '@/api';

const items = ref<TaskItemVo[]>([]);
const total = ref(0);
const loading = ref(false);
const errorMsg = ref('');

async function load(): Promise<void> {
  loading.value = true;
  errorMsg.value = '';
  try {
    const r = await getAvailableTasks();
    if (r.code === '0' && r.data) {
      items.value = r.data.items;
      total.value = r.data.total;
    } else {
      errorMsg.value = r.message || '加载失败';
    }
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : '网络错误';
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function formatYuan(fen: number): string {
  return (fen / 100).toFixed(2);
}
function formatMin(ms: number): string {
  const m = Math.floor((ms - Date.now()) / 60000);
  return m > 0 ? `${m} 分钟` : '已超时';
}
</script>

<template>
  <view class="tasks">
    <view class="tasks__title">可接任务列表</view>
    <view class="tasks__hint">兼容入口;底部 Tab 的“大厅”使用 pages/tasks/hall。</view>
    <view v-if="loading" class="tasks__loading">加载中...</view>
    <view v-else-if="errorMsg" class="tasks__error">{{ errorMsg }}</view>
    <view v-else-if="items.length === 0" class="tasks__empty">
      <text>暂无可接订单</text>
      <text class="tasks__empty-sub">暂无可接订单，请稍后刷新</text>
      <button class="tasks__refresh" @click="load">刷新</button>
    </view>
    <view v-else class="tasks__list">
      <view v-for="t in items" :key="t.taskId" class="tasks__item">
        <view class="tasks__row">
          <text class="tasks__biz">{{ t.bizType === 'takeaway' ? '外卖' : '跑腿' }}</text>
          <text class="tasks__reward">¥{{ formatYuan(t.reward) }}</text>
        </view>
        <view class="tasks__row">
          <text class="tasks__distance">{{ t.distance }} 米</text>
          <text class="tasks__deadline">剩余 {{ formatMin(t.deadline) }}</text>
        </view>
        <text class="tasks__addr">取:{{ t.pickupAddress.text }}</text>
        <text class="tasks__addr">送:{{ t.deliveryAddress.text }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.tasks {
  padding: 32rpx;
}
.tasks__title {
  font-size: 36rpx;
  font-weight: 600;
}
.tasks__hint {
  margin-top: 8rpx;
  color: #8a94a6;
  font-size: 24rpx;
}
.tasks__loading,
.tasks__error,
.tasks__empty {
  text-align: center;
  padding: 96rpx 0;
  color: #888;
  font-size: 28rpx;
}
.tasks__empty {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  align-items: center;
}
.tasks__empty-sub {
  font-size: 22rpx;
  color: #aaa;
}
.tasks__refresh {
  margin-top: 16rpx;
  background: #4c84ff;
  color: #fff;
  border-radius: 8rpx;
  padding: 8rpx 24rpx;
  font-size: 26rpx;
}
.tasks__list {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.tasks__item {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.tasks__row {
  display: flex;
  justify-content: space-between;
}
.tasks__biz {
  background: #4c84ff;
  color: #fff;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  font-size: 22rpx;
}
.tasks__reward {
  font-weight: 600;
  color: #ff4d4f;
}
.tasks__distance {
  font-size: 26rpx;
}
.tasks__deadline {
  font-size: 22rpx;
  color: #faad14;
}
.tasks__addr {
  font-size: 24rpx;
  color: #666;
}
</style>
