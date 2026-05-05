<template>
  <view class="page">
    <text class="title">跑腿报价</text>
    <view v-if="loading">加载中...</view>
    <view v-else-if="!quote">
      <text>报价失败,请返回重试</text>
    </view>
    <view v-else>
      <view class="row">
        <text class="label">基础费</text>
        <text class="value">¥{{ formatYuan(quote.baseFee) }}</text>
      </view>
      <view class="row">
        <text class="label">距离费</text>
        <text class="value">¥{{ formatYuan(quote.distanceFee) }}</text>
      </view>
      <view class="row">
        <text class="label">加急/重量费</text>
        <text class="value">¥{{ formatYuan(quote.urgentFee) }}</text>
      </view>
      <view class="row total">
        <text class="label">应付</text>
        <text class="value">¥{{ formatYuan(quote.payableAmount) }}</text>
      </view>
      <view class="row">
        <text class="label">距离</text>
        <text class="value">{{ quote.distanceMeters }} m</text>
      </view>
      <view v-if="quote.prohibitedWarnings.length > 0" class="warnings">
        <text class="warn-title">违禁品提示</text>
        <view v-for="w in quote.prohibitedWarnings" :key="w.keyword" class="warn-item">
          <text>{{ w.keyword }} - {{ w.description }}</text>
        </view>
      </view>
      <view class="actions">
        <button @click="goConfirm">下一步:确认下单</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useErrandFormStore } from '@/stores/errand-form';
import { useErrandQuoteStore } from '@/stores/errand-quote';
import { formatYuan } from '@/utils/format-price';

const formStore = useErrandFormStore();
const quoteStore = useErrandQuoteStore();
const loading = ref(true);
const quote = ref(quoteStore.current);

onMounted(async () => {
  if (!formStore.draft) {
    uni.showToast({ title: '请先填写表单', icon: 'none' });
    setTimeout(() => uni.navigateBack(), 800);
    return;
  }
  const r = await quoteStore.fetch(formStore.draft);
  quote.value = r;
  loading.value = false;
});

function goConfirm(): void {
  uni.navigateTo({ url: '/pages/errand/confirm/index' });
}
</script>

<style scoped>
.page {
  padding: 20px;
}
.title {
  font-size: 22px;
  font-weight: bold;
  display: block;
  margin-bottom: 16px;
}
.row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}
.row.total {
  font-weight: bold;
  font-size: 18px;
}
.label {
  color: #666;
}
.value {
  color: #333;
}
.warnings {
  margin-top: 16px;
  padding: 12px;
  background: #fff8e1;
  border-radius: 6px;
}
.warn-title {
  font-weight: bold;
  display: block;
  margin-bottom: 4px;
}
.warn-item {
  font-size: 13px;
  color: #ed6c02;
}
.actions {
  margin-top: 24px;
}
</style>
