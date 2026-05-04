<script setup lang="ts">
/** 骑手端启动页:验证 4 个预留 service + 字典预热 + 跳页测试 */
import { onLoad } from '@dcloudio/uni-app';
import { ref } from 'vue';

import { getDictionaries } from '@/api';
import { keepaliveService } from '@/services/keepalive';
import { locationService } from '@/services/location';
import { pushService } from '@/services/push';
import { traceUploadService } from '@/services/trace-upload';

const dictCount = ref<number>(0);
const lastError = ref<string>('');
const cid = ref<string | null>(null);
const lastPoint = ref<string>('-');
const keepaliveOn = ref<boolean>(false);

onLoad(async () => {
  try {
    const res = await getDictionaries(['order_errand_status']);
    if (res.code === '0') dictCount.value = res.data?.length ?? 0;
    else lastError.value = res.message;
  } catch (e) {
    lastError.value = e instanceof Error ? e.message : String(e);
  }
});

async function probeServices(): Promise<void> {
  await locationService.requestForegroundPermission();
  const p = await locationService.getOnce();
  lastPoint.value = `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`;

  traceUploadService.enqueue(p);
  await traceUploadService.flush();

  await pushService.init();
  cid.value = await pushService.getClientId();

  await keepaliveService.start();
  keepaliveOn.value = keepaliveService.isActive();
}

function gotoLogin(): void {
  uni.navigateTo({ url: '/pages/login/index' });
}

function gotoLocation(): void {
  uni.navigateTo({ url: '/pages/permission/location' });
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
      <text class="launch__title">O2O 骑手端</text>
      <text class="launch__sub">Android / iOS · 阶段 0 骨架(H5 仅调试)</text>
    </view>

    <view class="card">
      <text class="card__h">字典预热</text>
      <text v-if="lastError" class="card__err">{{ lastError }}</text>
      <text v-else class="card__ok">已加载跑腿状态字典 {{ dictCount }} 条</text>
    </view>

    <view class="card">
      <text class="card__h">预留能力 Service 探针(mock)</text>
      <button class="card__btn" @click="probeServices">触发 4 service mock 调用</button>
      <text class="card__line">最近定位点: {{ lastPoint }}</text>
      <text class="card__line">个推 cid: {{ cid ?? '未初始化' }}</text>
      <text class="card__line">保活状态: {{ keepaliveOn ? '开启' : '关闭' }}</text>
    </view>

    <view class="actions">
      <button class="actions__btn" @click="gotoLogin">登录占位</button>
      <button class="actions__btn actions__btn--ghost" @click="gotoLocation">定位授权</button>
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
  gap: 12rpx;
}
.card__h {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
.card__line {
  font-size: 24rpx;
  color: #555;
}
.card__btn {
  background: #1e8e3e;
  color: #fff;
  border-radius: 12rpx;
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
