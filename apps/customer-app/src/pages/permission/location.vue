<script setup lang="ts">
import { ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import NavBar from '@/components/common/NavBar.vue';

const status = ref<'idle' | 'requesting' | 'granted' | 'denied'>('idle');

async function request(): Promise<void> {
  status.value = 'requesting';
  try {
    const res = await uni.getLocation({ type: 'gcj02' });
    if (res.latitude && res.longitude) {
      status.value = 'granted';
      uni.navigateBack();
    } else {
      status.value = 'denied';
    }
  } catch {
    status.value = 'denied';
  }
}
</script>

<template>
  <view class="page">
    <NavBar title="定位授权" />
    <view class="page__icon"><SvgIcon name="location-pin" :size="80" color="var(--brand-primary)" /></view>
    <view class="page__title">开启同城定位</view>
    <text class="page__desc">用于显示附近的商家与配送范围。本端不保存原始坐标,仅用于业务展示。</text>
    <button class="page__btn" :loading="status === 'requesting'" @click="request">允许定位</button>
    <view v-if="status === 'denied'" class="page__err">未获得权限,可在系统设置中重新开启。</view>
  </view>
</template>

<style scoped>
.page {
  padding: 96rpx 40rpx;
  display: flex;
  flex-direction: column;
  gap: 28rpx;
  align-items: center;
  justify-content: center;
}
.page__icon {
  width: 132rpx;
  height: 132rpx;
  line-height: 132rpx;
  border-radius: 42rpx;
  text-align: center;
  font-size: 70rpx;
  background: #fff;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.1);
}
.page__title {
  font-size: 44rpx;
  font-weight: 800;
}
.page__desc {
  font-size: 26rpx;
  color: #666;
  text-align: center;
}
.page__btn {
  width: 80%;
  background: var(--brand-gradient);
  color: #fff;
  border-radius: 999rpx;
  font-weight: 700;
}
.page__err {
  color: #d93025;
  font-size: 24rpx;
}
</style>
