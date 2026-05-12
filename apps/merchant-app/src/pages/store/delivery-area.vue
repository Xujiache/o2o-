<script setup lang="ts">
/** 配送范围编辑。 */
import { ref } from 'vue';

import { updateStoreSettings } from '@/api';

const text = ref(
  JSON.stringify(
    {
      type: 'Polygon',
      coordinates: [
        [
          [116.4, 39.9],
          [116.5, 39.9],
          [116.5, 40.0],
          [116.4, 39.9],
        ],
      ],
    },
    null,
    2,
  ),
);
const errorMsg = ref('');
const okMsg = ref('');

async function onSave(): Promise<void> {
  errorMsg.value = '';
  okMsg.value = '';
  let geo;
  try {
    geo = JSON.parse(text.value);
  } catch {
    errorMsg.value = 'GeoJSON 格式错误';
    return;
  }
  try {
    const r = await updateStoreSettings({
      deliveryAreas: [{ geometry: geo, minOrderAmount: 1500, deliveryFee: 300 }],
    });
    if (r.code !== '0') {
      errorMsg.value = r.message;
      return;
    }
    okMsg.value = '已保存';
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '保存失败';
  }
}
</script>

<template>
  <view class="da">
    <view class="da__title">配送范围(GeoJSON Polygon)</view>
    <text class="da__hint">请按 GeoJSON Polygon 格式维护配送范围。</text>
    <textarea class="da__editor" v-model="text" />
    <button class="da__btn" @click="onSave">保存</button>
    <text v-if="okMsg" class="da__ok">{{ okMsg }}</text>
    <text v-if="errorMsg" class="da__error">{{ errorMsg }}</text>
  </view>
</template>

<style scoped>
.da {
  padding: 32rpx;
}
.da__title {
  font-size: 32rpx;
  font-weight: 600;
}
.da__hint {
  font-size: 22rpx;
  color: #888;
}
.da__editor {
  margin-top: 24rpx;
  width: 100%;
  height: 600rpx;
  font-family: monospace;
  font-size: 24rpx;
  background: #f5f5f5;
  padding: 16rpx;
}
.da__btn {
  margin-top: 32rpx;
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
.da__ok {
  color: #52c41a;
  font-size: 26rpx;
}
.da__error {
  color: #ff4d4f;
  font-size: 26rpx;
}
</style>
