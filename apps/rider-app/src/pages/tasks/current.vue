<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useTaskStore } from '@/stores/task';
import { labelRiderTaskStatus, nextActionsForRiderTask } from '@/utils/rider-task-status';

const store = useTaskStore();
const taskId = ref('');

function goAction(action: string): void {
  switch (action) {
    case 'arrive-pickup':
      uni.navigateTo({ url: `/pages/tasks/navigate?taskId=${taskId.value}&phase=pickup` });
      return;
    case 'pickup': {
      const url =
        store.current?.bizType === 'FOOD'
          ? `/pages/tasks/pickup-food?taskId=${taskId.value}`
          : `/pages/tasks/pickup-errand?taskId=${taskId.value}`;
      uni.navigateTo({ url });
      return;
    }
    case 'delivered':
      uni.navigateTo({ url: `/pages/tasks/delivered?taskId=${taskId.value}` });
      return;
    case 'exception':
      uni.navigateTo({ url: `/pages/tasks/exception?taskId=${taskId.value}` });
  }
}

onMounted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts = (uni as any).getLaunchOptionsSync?.() ?? {};
  taskId.value = (opts.query?.taskId ?? '') as string;
  if (taskId.value) void store.load(taskId.value);
});
</script>

<template>
  <view class="cur">
    <view v-if="store.current" class="cur__card">
      <view class="cur__row"
        ><text>类型</text><text>{{ store.current.bizType }}</text></view
      >
      <view class="cur__row"
        ><text>订单</text><text>{{ store.current.bizOrderId }}</text></view
      >
      <view class="cur__row"
        ><text>状态</text><text>{{ labelRiderTaskStatus(store.current.status) }}</text></view
      >
    </view>
    <view v-else class="cur__msg">无当前任务</view>
    <view class="cur__actions">
      <button
        v-for="a in nextActionsForRiderTask(store.current?.status ?? '')"
        :key="a"
        type="primary"
        @tap="goAction(a)"
      >
        {{ a }}
      </button>
    </view>
  </view>
</template>

<style scoped>
.cur {
  padding: 24rpx;
}
.cur__card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
}
.cur__row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.cur__row:last-child {
  border-bottom: none;
}
.cur__msg {
  text-align: center;
  padding: 80rpx;
  color: #888;
}
.cur__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 24rpx;
}
</style>
