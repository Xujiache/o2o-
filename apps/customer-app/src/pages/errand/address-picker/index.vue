<script setup lang="ts">
import { ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';

const address = ref('');

function confirm(): void {
  if (!address.value.trim()) {
    uni.showToast({ title: '请输入地址', icon: 'none' });
    return;
  }
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const page = (getCurrentPages?.() ?? []).slice(-1)[0] as { getOpenerEventChannel?: () => unknown } | undefined;
  const eventChannel = page?.getOpenerEventChannel?.() as any;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (eventChannel?.emit) {
    eventChannel.emit('address:selected', { address: address.value });
  }
  uni.navigateBack();
}
</script>

<template>
  <view class="picker">
    <view class="picker__hero">
      <text class="picker__eyebrow">选择地址</text>
      <text class="picker__title">输入详细地址</text>
    </view>

    <view class="picker__card">
      <view class="picker__field">
        <view class="picker__label"><text>详细地址</text><text class="picker__required">*</text></view>
        <input v-model="address" placeholder="街道、门牌、楼栋..." class="picker__input" />
      </view>
    </view>

    <view class="picker__hint">
      <SvgIcon name="lightbulb" :size="24" color="#ffb400" />
      <text class="picker__hint-text">请填写可准确找到的位置,方便骑手取送。</text>
    </view>

    <view class="picker__bar">
      <button class="picker__cta" @click="confirm">确认</button>
    </view>
  </view>
</template>

<style scoped>
.picker {
  min-height: 100vh;
  padding: 0 0 200rpx;
  background: #fff;
}
.picker__hero {
  position: relative;
  z-index: 1;
  padding: 40rpx 32rpx 56rpx;
  background: linear-gradient(135deg, #5b5ff8 0%, #00b8d9 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.picker__eyebrow {
  font-size: 22rpx;
  letter-spacing: 1rpx;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  align-self: flex-start;
}
.picker__title {
  font-size: 40rpx;
  font-weight: 800;
  margin-top: 18rpx;
}

.picker__card {
  position: relative;
  z-index: 2;
  margin: -28rpx 24rpx 0;
  padding: 8rpx 28rpx;
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.08);
}
.picker__field {
  padding: 24rpx 0;
}
.picker__label {
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: #5a6275;
  margin-bottom: 12rpx;
}
.picker__required {
  color: #ff4d4f;
  margin-left: 4rpx;
}
.picker__input {
  width: 100%;
  min-height: 80rpx;
  padding: 20rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #172033;
  box-sizing: border-box;
}

.picker__hint {
  margin: 24rpx;
  padding: 20rpx 24rpx;
  background: rgba(91, 95, 248, 0.06);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.picker__hint-icon {
  font-size: 28rpx;
}
.picker__hint-text {
  font-size: 22rpx;
  color: #5a6275;
  flex: 1;
  line-height: 1.5;
}

.picker__bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 24rpx calc(env(safe-area-inset-bottom, 0rpx) + 24rpx);
  background: #fff;
  border-top: 1rpx solid rgba(31, 41, 55, 0.06);
  z-index: 50;
}
.picker__cta {
  background: linear-gradient(135deg, #5b5ff8, #00b8d9);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: 999rpx;
  padding: 24rpx 0;
  box-shadow: 0 16rpx 40rpx rgba(91, 95, 248, 0.32);
}
</style>
