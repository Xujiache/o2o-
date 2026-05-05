<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { getStore, setBusinessStatus, type StoreVo } from '@/api';

const store = ref<StoreVo | null>(null);
const submitting = ref(false);
const errorMsg = ref('');

async function load(): Promise<void> {
  const r = await getStore();
  if (r.code === '0' && r.data) store.value = r.data;
}

onMounted(load);

async function toggle(target: 'online' | 'offline'): Promise<void> {
  errorMsg.value = '';
  submitting.value = true;
  try {
    const r = await setBusinessStatus({ businessStatus: target });
    if (r.code !== '0') {
      errorMsg.value = r.message;
      return;
    }
    await load();
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '切换失败';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="bs">
    <view class="bs__title">营业开关</view>
    <view v-if="store" class="bs__panel">
      <text class="bs__current">当前状态:{{ store.businessStatus }}</text>
      <button
        v-if="store.businessStatus !== 'paused'"
        class="bs__btn"
        :disabled="submitting"
        @click="toggle(store.businessStatus === 'online' ? 'offline' : 'online')"
      >
        {{ store.businessStatus === 'online' ? '休业' : '开始营业' }}
      </button>
      <text v-else class="bs__alert">店铺已被平台强制下线,请联系平台</text>
    </view>
    <text v-if="errorMsg" class="bs__error">{{ errorMsg }}</text>
  </view>
</template>

<style scoped>
.bs {
  padding: 32rpx;
}
.bs__title {
  font-size: 36rpx;
  font-weight: 600;
}
.bs__panel {
  margin-top: 32rpx;
  background: #fff;
  padding: 32rpx;
  border-radius: 12rpx;
}
.bs__current {
  font-size: 28rpx;
}
.bs__btn {
  margin-top: 32rpx;
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
.bs__alert {
  display: block;
  margin-top: 32rpx;
  color: #ff4d4f;
  font-size: 24rpx;
}
.bs__error {
  color: #ff4d4f;
}
</style>
