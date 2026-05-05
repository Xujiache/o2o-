<template>
  <view class="page">
    <view class="header">
      <text class="title">跑腿服务</text>
      <text class="subtitle">代买、代送、代办,一切由您</text>
    </view>
    <view class="grid">
      <view v-for="t in types" :key="t.typeCode" class="card" @click="goToForm(t.typeCode)">
        <text class="card-title">{{ t.name }}</text>
        <text class="card-desc">{{ t.description }}</text>
      </view>
    </view>
    <view class="actions">
      <button @click="goToOrders">我的跑腿订单</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { listErrandTypes, type ErrandTypeVo } from '@/api/errand-types';

const types = ref<ErrandTypeVo[]>([]);

const FORM_PATH: Record<string, string> = {
  BUY: '/pages/errand/form/buy',
  DELIVER: '/pages/errand/form/deliver',
  HELP: '/pages/errand/form/help',
  CUSTOM: '/pages/errand/form/custom',
};

onMounted(async () => {
  const r = await listErrandTypes();
  if (r.code === '0' && r.data) {
    types.value = r.data.list;
  }
});

function goToForm(typeCode: string): void {
  uni.navigateTo({ url: FORM_PATH[typeCode] ?? '/pages/errand/form/custom' });
}
function goToOrders(): void {
  uni.navigateTo({ url: '/pages/errand/order/list' });
}
</script>

<style scoped>
.page {
  padding: 20px;
}
.header {
  margin-bottom: 24px;
}
.title {
  font-size: 24px;
  font-weight: bold;
  display: block;
}
.subtitle {
  font-size: 14px;
  color: #888;
  display: block;
  margin-top: 4px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.card {
  padding: 24px 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #eee;
}
.card-title {
  font-size: 18px;
  font-weight: bold;
  display: block;
}
.card-desc {
  font-size: 12px;
  color: #666;
  display: block;
  margin-top: 8px;
}
.actions {
  margin-top: 24px;
}
</style>
