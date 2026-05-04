<script setup lang="ts">
/** 启动页(商家端):占位 + 跳页测试。完整登录流程在阶段 2 接入 */
import { onLoad } from '@dcloudio/uni-app';
import { ref } from 'vue';

import { getDictionaries } from '@/api';

const dictCount = ref<number>(0);
const dictError = ref<string>('');

onLoad(async () => {
  try {
    const res = await getDictionaries(['order_takeaway_status']);
    if (res.code === '0') {
      dictCount.value = res.data?.length ?? 0;
    } else {
      dictError.value = res.message;
    }
  } catch (e) {
    dictError.value = e instanceof Error ? e.message : String(e);
  }
});

function gotoAuditPending(): void {
  uni.navigateTo({ url: '/pages/audit/pending' });
}

function gotoForbidden(): void {
  uni.navigateTo({ url: '/pages/error/forbidden' });
}

function gotoNetwork(): void {
  uni.navigateTo({ url: '/pages/error/network' });
}

function gotoMaintenance(): void {
  uni.navigateTo({ url: '/pages/error/maintenance' });
}
</script>

<template>
  <view class="launch">
    <view class="launch__header">
      <text class="launch__title">O2O 商家端</text>
      <text class="launch__sub">仅 Android APP / iOS APP · 阶段 0 骨架</text>
    </view>

    <view class="card">
      <text class="card__h">字典预热(/pub/dictionaries)</text>
      <text v-if="dictError" class="card__err">{{ dictError }}</text>
      <text v-else class="card__ok">已加载外卖状态字典 {{ dictCount }} 条</text>
    </view>

    <view class="actions">
      <button class="actions__btn" @click="gotoAuditPending">审核中占位</button>
      <button class="actions__btn actions__btn--ghost" @click="gotoForbidden">无权限</button>
      <button class="actions__btn actions__btn--ghost" @click="gotoNetwork">网络错误</button>
      <button class="actions__btn actions__btn--ghost" @click="gotoMaintenance">系统维护</button>
    </view>
  </view>
</template>

<style scoped>
.launch {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.launch__header {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: 32rpx 0;
}
.launch__title {
  font-size: 48rpx;
  font-weight: 600;
}
.launch__sub {
  font-size: 24rpx;
  color: #888;
}
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.card__h {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
.card__ok {
  font-size: 24rpx;
  color: #1e8e3e;
}
.card__err {
  font-size: 24rpx;
  color: #d93025;
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.actions__btn {
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
.actions__btn--ghost {
  background: #fff;
  color: #4c84ff;
  border: 1rpx solid #4c84ff;
}
</style>
