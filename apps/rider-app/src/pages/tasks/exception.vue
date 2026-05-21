<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { ref } from 'vue';

import { locationService } from '@/services/location';
import { useTaskStore } from '@/stores/task';

const store = useTaskStore();
const taskId = ref('');
const exceptionType = ref<'EXCEPTION' | 'LATE' | 'COMPLAINT' | 'FRAUD'>('EXCEPTION');
const description = ref('');
const submitting = ref(false);
const locationMsg = ref('');

async function submit(): Promise<void> {
  if (!description.value.trim()) {
    uni.showToast({ title: '请填写说明', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    locationMsg.value = '';
    const point = await locationService.getOnce().catch((err) => {
      locationMsg.value = err instanceof Error ? err.message : '定位失败';
      return null;
    });
    if (!point) {
      uni.showToast({ title: locationMsg.value, icon: 'none' });
      return;
    }
    const ok = await store.reportException(taskId.value, {
      exceptionType: exceptionType.value,
      description: description.value,
      lng: point.longitude,
      lat: point.latitude,
    });
    if (ok) {
      uni.showToast({ title: '已上报,等待平台处理', icon: 'success' });
      setTimeout(() => uni.switchTab({ url: '/pages/workbench/index' }), 800);
    } else {
      uni.showToast({ title: '上报失败', icon: 'none' });
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
  <view class="e">
    <view class="e__title">异常报备</view>
    <view class="e__seg">
      <text :class="{ on: exceptionType === 'EXCEPTION' }" @tap="exceptionType = 'EXCEPTION'">异常</text>
      <text :class="{ on: exceptionType === 'LATE' }" @tap="exceptionType = 'LATE'">超时</text>
      <text :class="{ on: exceptionType === 'COMPLAINT' }" @tap="exceptionType = 'COMPLAINT'">投诉</text>
    </view>
    <textarea v-model="description" placeholder="请描述异常情况(必填)" maxlength="500" />
    <text v-if="locationMsg" class="e__error">{{ locationMsg }}</text>
    <button class="e__warn" :loading="submitting" @tap="submit">提交报备</button>
  </view>
</template>

<style scoped>
.e {
  padding: 24rpx;
}
.e__title {
  font-size: 32rpx;
  font-weight: 600;
  padding: 16rpx 0;
}
.e__seg {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.e__seg text {
  flex: 1;
  text-align: center;
  padding: 16rpx;
  background: #f0f0f0;
  border-radius: 8rpx;
}
.e__seg text.on {
  background: var(--price-color);
  color: #fff;
}
.e textarea {
  width: 100%;
  background: #fff;
  padding: 16rpx;
  border-radius: 12rpx;
  height: 200rpx;
  margin-bottom: 24rpx;
}
.e__error {
  display: block;
  color: var(--price-color);
  font-size: 24rpx;
  margin-bottom: 16rpx;
}
.e__warn {
  background: var(--price-color);
  color: #fff;
}
</style>
