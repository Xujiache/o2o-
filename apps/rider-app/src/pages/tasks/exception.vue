<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useTaskStore } from '@/stores/task';

const store = useTaskStore();
const taskId = ref('');
const exceptionType = ref<'EXCEPTION' | 'LATE' | 'COMPLAINT' | 'FRAUD'>('EXCEPTION');
const description = ref('');
const submitting = ref(false);

const lng = 116.4 + Math.random() * 0.01;
const lat = 39.9 + Math.random() * 0.01;

async function submit(): Promise<void> {
  if (!description.value.trim()) {
    uni.showToast({ title: '请填写说明', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    const ok = await store.reportException(taskId.value, {
      exceptionType: exceptionType.value,
      description: description.value,
      lng,
      lat,
    });
    if (ok) {
      uni.showToast({ title: '已上报,等待平台处理', icon: 'success' });
      setTimeout(() => uni.redirectTo({ url: '/pages/workbench/index' }), 800);
    } else {
      uni.showToast({ title: '上报失败', icon: 'none' });
    }
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts = (uni as any).getLaunchOptionsSync?.() ?? {};
  taskId.value = (opts.query?.taskId ?? '') as string;
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
    <button type="warn" :loading="submitting" @tap="submit">提交报备</button>
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
  background: #ff4d4f;
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
</style>
