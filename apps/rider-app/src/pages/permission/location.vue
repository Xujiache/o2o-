<script setup lang="ts">
/** 骑手端定位授权页:依次申请前台 + 后台权限 */
import { ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import { locationService } from '@/services/location';

const status = ref<'idle' | 'requesting' | 'fg-granted' | 'bg-granted' | 'denied'>('idle');

async function requestAll(): Promise<void> {
  status.value = 'requesting';
  const fg = await locationService.requestForegroundPermission();
  if (!fg) {
    status.value = 'denied';
    return;
  }
  status.value = 'fg-granted';
  const bg = await locationService.requestBackgroundPermission();
  status.value = bg ? 'bg-granted' : 'fg-granted';
}
</script>

<template>
  <view class="page">
    <view class="page__icon"><SvgIcon name="radio-tower" :size="80" color="#0f766e" /></view>
    <view class="page__title">开启配送定位</view>
    <text class="page__desc">配送过程中需要前台与后台定位,以便上报轨迹给商家与顾客。</text>
    <text class="page__desc">Android: 系统会先弹「使用 APP 期间」,再弹「始终允许」。</text>
    <text class="page__desc">iOS: 请在系统设置中将定位权限改为「始终」。</text>
    <button class="page__btn" :loading="status === 'requesting'" @click="requestAll">申请定位权限</button>
    <view v-if="status === 'fg-granted'" class="page__warn">已获前台权限,请继续允许后台权限</view>
    <view v-if="status === 'bg-granted'" class="page__ok">已获前后台权限</view>
    <view v-if="status === 'denied'" class="page__err">权限被拒,请在系统设置中开启</view>
  </view>
</template>

<style scoped>
.page {
  padding: 64rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
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
.page__ok {
  color: #1e8e3e;
  font-size: 24rpx;
}
.page__warn {
  color: #e37400;
  font-size: 24rpx;
}
.page__err {
  color: #d93025;
  font-size: 24rpx;
}
</style>
