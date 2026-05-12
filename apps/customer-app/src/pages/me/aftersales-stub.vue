<script setup lang="ts">
import SvgIcon from '@/components/common/SvgIcon.vue';

function back(): void {
  uni.navigateBack();
}
</script>

<template>
  <view class="stub">
    <view class="stub__icon">
      <SvgIcon name="life-buoy" :size="120" color="#0f766e" />
    </view>
    <view class="stub__title">售后申请</view>
    <view class="stub__msg">当前订单如需售后,请联系商家或平台客服处理。</view>
    <button @tap="back">返回</button>
  </view>
</template>

<style scoped>
.stub {
  padding: 100rpx 40rpx;
  text-align: center;
}
.stub__icon {
  font-size: 120rpx;
}
.stub__title {
  font-size: 36rpx;
  font-weight: 600;
  margin: 30rpx 0;
}
.stub__msg {
  color: #888;
  margin-bottom: 60rpx;
}
</style>
