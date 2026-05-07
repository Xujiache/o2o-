<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';

import FloatTabBar from '@/components/common/FloatTabBar.vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

const entries = [
  { key: 'orders', label: '我的订单', enabled: true },
  { key: 'favorites', label: '我的收藏', enabled: false },
  { key: 'coupons', label: '我的优惠券', enabled: false },
  { key: 'points', label: '我的积分', enabled: false },
  { key: 'wallet', label: '我的钱包', enabled: false },
  { key: 'notifications', label: '消息设置', enabled: true },
];

function onEntry(item: { key: string; enabled: boolean }): void {
  if (!item.enabled) {
    uni.showToast({ title: '敬请期待', icon: 'none' });
    return;
  }
  if (item.key === 'orders') {
    uni.switchTab({ url: '/pages/food/order/list' });
    return;
  }
  if (item.key === 'notifications') {
    uni.navigateTo({ url: '/pages/me/notification' });
  }
}

function goSecurity(): void {
  uni.navigateTo({ url: '/pages/me/security' });
}

function goAddress(): void {
  uni.navigateTo({ url: '/pages/address/list' });
}

function goRealname(): void {
  uni.navigateTo({ url: '/pages/profile/realname' });
}

function ensureLoggedIn(): boolean {
  if (!auth.isLoggedIn) {
    uni.reLaunch({ url: '/pages/login/index' });
    return false;
  }
  return true;
}

ensureLoggedIn();

onShow(() => uni.hideTabBar({ animation: false }));
</script>

<template>
  <view class="me">
    <view class="me__header">
      <view class="me__avatar" />
      <view class="me__user">
        <text class="me__nickname">用户(已登录)</text>
        <text class="me__hint">{{ auth.profileCompleted ? '资料已完善' : '资料待完善' }}</text>
      </view>
      <text class="me__badge">VIP</text>
    </view>

    <view class="me__menu">
      <view class="me__menu-item" @click="goRealname">
        <text>实名认证</text>
        <text class="me__chev">›</text>
      </view>
      <view class="me__menu-item" @click="goAddress">
        <text>收件地址</text>
        <text class="me__chev">›</text>
      </view>
      <view class="me__menu-item" @click="goSecurity">
        <text>账号安全</text>
        <text class="me__chev">›</text>
      </view>
    </view>

    <view class="me__entries">
      <view v-for="e in entries" :key="e.key" class="me__entry" @click="onEntry(e)">
        <text>{{ e.label }}</text>
        <text class="me__chev">›</text>
      </view>
    </view>
    <FloatTabBar active="me" />
  </view>
</template>

<style scoped>
.me {
  padding: 28rpx 24rpx 200rpx;
  min-height: 100vh;
}
.me__header {
  background: linear-gradient(135deg, #273248, #56637a);
  color: #fff;
  padding: 44rpx 32rpx;
  border-radius: 34rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  box-shadow: 0 20rpx 54rpx rgba(23, 32, 51, 0.2);
}
.me__avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  box-shadow: inset 0 0 0 6rpx rgba(255, 255, 255, 0.24);
}
.me__user {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.me__nickname {
  font-size: 32rpx;
  font-weight: 800;
}
.me__hint {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.76);
}
.me__badge {
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.16);
  font-size: 22rpx;
}
.me__menu,
.me__entries {
  background: #fff;
  margin-top: 16rpx;
  border-radius: 28rpx;
  overflow: hidden;
}
.me__menu-item,
.me__entry {
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 28rpx;
}
.me__chev {
  color: #ccc;
  font-size: 36rpx;
}
</style>
