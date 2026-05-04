<script setup lang="ts">
import { ref } from 'vue';

const NS = 'o2o:customer:notification';

interface Settings {
  orderNotify: boolean;
  activityNotify: boolean;
  smsNotify: boolean;
}

function load(): Settings {
  try {
    const v = uni.getStorageSync(NS);
    if (v) return JSON.parse(v) as Settings;
  } catch {
    // ignore
  }
  return { orderNotify: true, activityNotify: true, smsNotify: true };
}

const settings = ref<Settings>(load());

function persist(): void {
  try {
    uni.setStorageSync(NS, JSON.stringify(settings.value));
  } catch {
    // ignore
  }
}

function toggle(key: keyof Settings, value: boolean): void {
  settings.value[key] = value;
  persist();
}
</script>

<template>
  <view class="notification">
    <view class="notification__title">消息设置</view>
    <text class="notification__hint">本地开关,接口在 stage 1+ 启用</text>

    <view class="notification__row">
      <text>订单状态推送</text>
      <switch
        :checked="settings.orderNotify"
        @change="(e) => toggle('orderNotify', (e as unknown as { detail: { value: boolean } }).detail.value)"
      />
    </view>
    <view class="notification__row">
      <text>活动通知</text>
      <switch
        :checked="settings.activityNotify"
        @change="(e) => toggle('activityNotify', (e as unknown as { detail: { value: boolean } }).detail.value)"
      />
    </view>
    <view class="notification__row">
      <text>短信通知</text>
      <switch
        :checked="settings.smsNotify"
        @change="(e) => toggle('smsNotify', (e as unknown as { detail: { value: boolean } }).detail.value)"
      />
    </view>
  </view>
</template>

<style scoped>
.notification {
  padding: 32rpx;
  background: #f5f5f5;
  min-height: 100vh;
}
.notification__title {
  font-size: 36rpx;
  font-weight: 600;
}
.notification__hint {
  font-size: 24rpx;
  color: #888;
  margin-top: 8rpx;
}
.notification__row {
  background: #fff;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 28rpx;
  margin-top: 16rpx;
}
</style>
