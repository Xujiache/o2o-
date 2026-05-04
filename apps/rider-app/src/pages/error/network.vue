<script setup lang="ts">
function retry(): void {
  uni.reLaunch({ url: '/pages/launch/index' });
}
</script>

<template>
  <view class="page">
    <view class="page__icon">📡</view>
    <view class="page__title">网络错误</view>
    <text class="page__desc">连接服务器失败,请检查网络后重试。</text>
    <button class="page__btn" @click="retry">重试</button>
  </view>
</template>

<style scoped>
.page {
  padding: 96rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  align-items: center;
}
.page__icon {
  font-size: 96rpx;
}
.page__title {
  font-size: 40rpx;
  font-weight: 600;
}
.page__desc {
  color: #666;
  font-size: 26rpx;
  text-align: center;
}
.page__btn {
  width: 60%;
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
</style>
