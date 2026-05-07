<script setup lang="ts">
import SvgIcon from '@/components/common/SvgIcon.vue';

function home(): void {
  uni.reLaunch({ url: '/pages/launch/index' });
}
</script>

<template>
  <view class="page">
    <view class="page__icon"><SvgIcon name="ban" :size="100" color="#d33" /></view>
    <view class="page__title">无权限</view>
    <text class="page__desc">您当前账号不可访问此页面。</text>
    <button class="page__btn" @click="home">返回首页</button>
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
}
.page__btn {
  width: 60%;
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
</style>
