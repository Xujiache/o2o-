<script setup lang="ts">
/** 定位授权页:阶段 0 占位,实际授权流程在阶段 1 实现 */
import { ref } from 'vue';

const status = ref<'idle' | 'requesting' | 'granted' | 'denied'>('idle');

async function request(): Promise<void> {
  status.value = 'requesting';
  try {
    const res = await uni.getLocation({ type: 'gcj02' });
    if (res.latitude && res.longitude) {
      status.value = 'granted';
      uni.navigateBack();
    } else {
      status.value = 'denied';
    }
  } catch {
    status.value = 'denied';
  }
}
</script>

<template>
  <view class="page">
    <view class="page__title">需要定位权限</view>
    <text class="page__desc">用于显示附近的商家与配送范围。本端不保存原始坐标,仅用于业务展示。</text>
    <button class="page__btn" :loading="status === 'requesting'" @click="request">允许定位</button>
    <view v-if="status === 'denied'" class="page__err">未获得权限,可在系统设置中重新开启。</view>
  </view>
</template>

<style scoped>
.page {
  padding: 64rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  align-items: center;
}
.page__title {
  font-size: 40rpx;
  font-weight: 600;
}
.page__desc {
  font-size: 26rpx;
  color: #666;
  text-align: center;
}
.page__btn {
  width: 80%;
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
.page__err {
  color: #d93025;
  font-size: 24rpx;
}
</style>
