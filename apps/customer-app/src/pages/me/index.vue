<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

const entries = [
  { key: 'orders', label: '我的订单', enabled: false },
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
</script>

<template>
  <view class="me">
    <view class="me__header">
      <view class="me__avatar" />
      <view class="me__user">
        <text class="me__nickname">用户(已登录)</text>
        <text class="me__hint">{{ auth.profileCompleted ? '资料已完善' : '资料待完善' }}</text>
      </view>
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
  </view>
</template>

<style scoped>
.me {
  background: #f5f5f5;
  min-height: 100vh;
}
.me__header {
  background: #fff;
  padding: 48rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.me__avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, #4c84ff, #00d2ff);
}
.me__user {
  display: flex;
  flex-direction: column;
}
.me__nickname {
  font-size: 32rpx;
  font-weight: 600;
}
.me__hint {
  font-size: 24rpx;
  color: #888;
}
.me__menu,
.me__entries {
  background: #fff;
  margin-top: 16rpx;
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
