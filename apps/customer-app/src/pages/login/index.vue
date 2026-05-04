<script setup lang="ts">
/** 登录占位页:阶段 0 仅占位,实际登录流程在阶段 1 实现 */
function back(): void {
  uni.reLaunch({ url: '/pages/launch/index' });
}
</script>

<template>
  <view class="page">
    <view class="page__title">登录</view>
    <text class="page__desc">阶段 0 仅占位,完整登录流程在阶段 1 接入(短信/微信/Apple)。</text>
    <button class="page__btn" disabled>登录(占位)</button>
    <button class="page__btn page__btn--ghost" @click="back">返回首页</button>
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
.page__btn--ghost {
  background: #fff;
  color: #4c84ff;
  border: 1rpx solid #4c84ff;
}
</style>
