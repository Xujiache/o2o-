<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { getOnboardingStatus, type OnboardingStatusVo } from '@/api';

const status = ref<OnboardingStatusVo | null>(null);
const loading = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await getOnboardingStatus();
    if (r.code === '0' && r.data) status.value = r.data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function onResubmit(): void {
  uni.navigateTo({ url: '/pages/onboarding/apply' });
}
</script>

<template>
  <view class="progress">
    <view class="progress__title">入驻审核进度</view>

    <view v-if="loading" class="progress__loading">加载中...</view>
    <view v-else-if="status" class="progress__card">
      <view class="progress__row">
        <text>状态</text>
        <text class="progress__status" :class="`progress__status--${status.auditStatus}`">{{
          status.auditStatus
        }}</text>
      </view>
      <view v-if="status.lastSubmittedAt" class="progress__row">
        <text>最近提交</text>
        <text>{{ new Date(Number(status.lastSubmittedAt)).toLocaleString() }}</text>
      </view>
      <view v-if="status.storeName" class="progress__row">
        <text>店铺名</text>
        <text>{{ status.storeName }}</text>
      </view>
      <view v-if="status.rejectReason" class="progress__alert"> 驳回原因:{{ status.rejectReason }} </view>
      <button v-if="status.canResubmit" class="progress__btn" @click="onResubmit">重新提交</button>
    </view>
  </view>
</template>

<style scoped>
.progress {
  padding: 32rpx;
}
.progress__title {
  font-size: 36rpx;
  font-weight: 600;
}
.progress__loading {
  font-size: 28rpx;
  color: #888;
  padding: 64rpx 0;
  text-align: center;
}
.progress__card {
  background: #fff;
  border-radius: 12rpx;
  padding: 32rpx;
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.progress__row {
  display: flex;
  justify-content: space-between;
  font-size: 28rpx;
}
.progress__status {
  font-weight: 600;
}
.progress__status--approved {
  color: #52c41a;
}
.progress__status--rejected {
  color: #ff4d4f;
}
.progress__status--pending {
  color: #faad14;
}
.progress__alert {
  background: #fff1f0;
  color: #ff4d4f;
  padding: 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
}
.progress__btn {
  margin-top: 32rpx;
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
</style>
