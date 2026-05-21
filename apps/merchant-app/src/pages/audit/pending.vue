<script setup lang="ts">
/** 商家端审核中页面。 */
import NavBar from '@/components/common/NavBar.vue';

function back(): void {
  uni.reLaunch({ url: '/pages/launch/index' });
}
</script>

<template>
  <view class="page">
    <NavBar title="审核中" />
    <view class="page__icon">⏳</view>
    <view class="page__title">资质审核中</view>
    <text class="page__desc">您的入驻资料已提交,平台将在 1-2 个工作日完成审核。</text>
    <text class="page__desc">审核通过后即可上架商品并接收订单。</text>
    <button class="page__btn" @click="back">返回首页</button>
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
