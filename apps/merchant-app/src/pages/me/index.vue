<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

function logout(): void {
  void auth.logout();
  uni.redirectTo({ url: '/pages/login/index' });
}
</script>

<template>
  <view class="me">
    <view class="me__header">
      <text class="me__mobile">{{ auth.isLoggedIn ? '已登录' : '未登录' }}</text>
      <text class="me__status">{{ auth.accountStatus || '-' }}</text>
    </view>
    <view class="me__menu">
      <view class="me__item" @tap="$emit('go-onboarding')">
        <text>入驻进度</text>
      </view>
      <view class="me__item" @tap="logout">
        <text style="color: #d33">退出登录</text>
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
}
.me__mobile {
  font-size: 32rpx;
  font-weight: 600;
}
.me__status {
  font-size: 22rpx;
  color: #888;
  margin-left: 16rpx;
}
.me__menu {
  background: #fff;
  margin-top: 16rpx;
}
.me__item {
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
</style>
