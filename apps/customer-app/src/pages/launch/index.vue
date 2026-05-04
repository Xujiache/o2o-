<script setup lang="ts">
/** 启动页:加载字典 + 演示 MapView/StatusTag/FileUpload(满足 T17 验收) */
import { onLoad } from '@dcloudio/uni-app';
import { onMounted, ref } from 'vue';

import FileUpload from '@/components/common/FileUpload.vue';
import MapView from '@/components/common/MapView.vue';
import StatusTag from '@/components/common/StatusTag.vue';
import { type UploadResultVo } from '@/api';
import { useDictStore } from '@/stores/dict';

const dict = useDictStore();
const uploadedUrl = ref<string>('');
const uploadError = ref<string>('');

const center = ref({ latitude: 39.9042, longitude: 116.4074 });

onLoad(() => {
  dict.load(['order_takeaway_status', 'order_errand_status']);
});

onMounted(() => {
  /* H5 模式下点击启动页空白处可前往登录占位 */
});

function onUploaded(vo: UploadResultVo): void {
  uploadedUrl.value = vo.url;
  uploadError.value = '';
  uni.showToast({ title: `上传成功 (${vo.size} bytes)`, icon: 'success' });
}

function onUploadError(message: string): void {
  uploadError.value = message;
}

function goLogin(): void {
  uni.navigateTo({ url: '/pages/login/index' });
}

function goLocationPermission(): void {
  uni.navigateTo({ url: '/pages/permission/location' });
}
</script>

<template>
  <view class="launch">
    <view class="launch__header">
      <text class="launch__title">O2O 用户端</text>
      <text class="launch__sub">外卖 + 跑腿 · 阶段 0 演示骨架</text>
    </view>

    <view class="card">
      <text class="card__h">字典 / StatusTag</text>
      <view v-if="dict.loading">加载中...</view>
      <view v-else-if="dict.error" class="card__err">{{ dict.error }}</view>
      <view v-else class="tags">
        <StatusTag dict-type="order_takeaway_status" code="WAIT_PAY" />
        <StatusTag dict-type="order_takeaway_status" code="PREPARING" />
        <StatusTag dict-type="order_takeaway_status" code="DELIVERED" />
        <StatusTag dict-type="order_takeaway_status" code="CANCELLED" />
        <StatusTag dict-type="order_errand_status" code="RIDER_ASSIGNED" />
      </view>
    </view>

    <view class="card">
      <text class="card__h">MapView(高德占位 key)</text>
      <MapView :latitude="center.latitude" :longitude="center.longitude" height="360rpx" />
    </view>

    <view class="card">
      <text class="card__h">FileUpload(/pub/files/upload)</text>
      <FileUpload biz-type="avatar" @uploaded="onUploaded" @error="onUploadError" />
      <text v-if="uploadedUrl" class="card__ok">URL: {{ uploadedUrl }}</text>
      <text v-if="uploadError" class="card__err">{{ uploadError }}</text>
    </view>

    <view class="actions">
      <button class="actions__btn" @click="goLogin">登录占位</button>
      <button class="actions__btn actions__btn--ghost" @click="goLocationPermission">定位授权</button>
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
  font-size: 22rpx;
  color: #1e8e3e;
  word-break: break-all;
}
.card__err {
  font-size: 24rpx;
  color: #d93025;
}
.tags {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}
.actions {
  display: flex;
  gap: 16rpx;
}
.actions__btn {
  flex: 1;
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
