<template>
  <view class="page">
    <text class="title">选择地址</text>
    <input v-model="address" placeholder="详细地址" class="input" />
    <view class="hint"> stage 6 简化:输入文字地址即可;真定位/搜索 stage 8 接高德 SDK。 </view>
    <view class="actions">
      <button @click="confirm">确认</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const address = ref('');

function confirm(): void {
  if (!address.value.trim()) {
    uni.showToast({ title: '请输入地址', icon: 'none' });
    return;
  }
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const eventChannel = (getCurrentPages?.() ?? []).slice(-1)[0]?.getOpenerEventChannel?.() as any;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (eventChannel?.emit) {
    eventChannel.emit('address:selected', { address: address.value });
  }
  uni.navigateBack();
}
</script>

<style scoped>
.page {
  padding: 16px;
}
.title {
  font-size: 22px;
  font-weight: bold;
  display: block;
  margin-bottom: 12px;
}
.input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
}
.hint {
  padding: 12px;
  background: #f5f5f5;
  border-radius: 6px;
  font-size: 13px;
  color: #888;
  margin-top: 12px;
}
.actions {
  margin-top: 24px;
}
</style>
