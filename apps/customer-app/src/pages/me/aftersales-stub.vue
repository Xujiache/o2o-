<script setup lang="ts">
function back(): void {
  uni.navigateBack();
}
</script>

<template>
  <view class="stub">
    <view class="stub__icon">🛟</view>
    <view class="stub__title">售后申请</view>
    <view class="stub__msg">售后系统将在 stage 7 上线,届时可在此发起退款 / 退货 / 投诉。</view>
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
