<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { ref } from 'vue';

import { useTaskStore } from '@/stores/task';

const store = useTaskStore();
const taskId = ref('');
const itemCheckResult = ref('OK');
const submitting = ref(false);

async function submit(): Promise<void> {
  submitting.value = true;
  try {
    const ok = await store.pickup(taskId.value, { itemCheckResult: itemCheckResult.value });
    if (ok) {
      uni.showToast({ title: '已取餐', icon: 'success' });
      setTimeout(() => uni.switchTab({ url: '/pages/tasks/current' }), 600);
    } else {
      uni.showToast({ title: '操作失败', icon: 'none' });
    }
  } finally {
    submitting.value = false;
  }
}

onLoad((options) => {
  taskId.value = (options?.taskId as string) ?? '';
});
</script>

<template>
  <view class="p">
    <view class="p__title">外卖取餐核验</view>
    <view class="p__row">
      <text>核验结果</text>
      <input v-model="itemCheckResult" />
    </view>
    <button type="primary" :loading="submitting" @tap="submit">确认取餐</button>
  </view>
</template>

<style scoped>
.p {
  padding: 24rpx;
}
.p__title {
  font-size: 32rpx;
  font-weight: 600;
  padding: 16rpx 0;
}
.p__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
}
.p__row input {
  background: #fff;
  padding: 14rpx 20rpx;
  border-radius: 10rpx;
  flex: 1;
  margin-left: 16rpx;
}
</style>
