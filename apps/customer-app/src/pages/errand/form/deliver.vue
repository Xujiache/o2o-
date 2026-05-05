<template>
  <view class="page">
    <text class="title">代送跑腿</text>
    <view class="field">
      <text class="label">取货地址 *</text>
      <input v-model="pickup" class="input" />
    </view>
    <view class="field">
      <text class="label">收货地址 *</text>
      <input v-model="delivery" class="input" />
    </view>
    <view class="field">
      <text class="label">物品描述 *</text>
      <textarea v-model="itemDesc" class="textarea" />
    </view>
    <view class="field">
      <text class="label">物品重量(kg)*</text>
      <input v-model.number="weight" type="digit" placeholder="0.5" class="input" />
    </view>
    <view class="field">
      <text class="label">紧急度</text>
      <picker :value="urgentIndex" :range="urgentRange" @change="onUrgentChange">
        <view class="picker">{{ urgentRange[urgentIndex] }}</view>
      </picker>
    </view>
    <view class="actions">
      <button :disabled="submitting" @click="submit">下一步:获取报价</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { useErrandFormStore } from '@/stores/errand-form';

const store = useErrandFormStore();
const pickup = ref('');
const delivery = ref('');
const itemDesc = ref('');
const weight = ref(0);

const urgentRange = ['标准', '加急', '特急'];
const urgentLevels = ['standard', 'fast', 'express'] as const;
const urgentIndex = ref(0);
function onUrgentChange(e: { detail: { value: number } }): void {
  urgentIndex.value = e.detail.value;
}
const submitting = ref(false);

function submit(): void {
  if (!pickup.value.trim() || !delivery.value.trim() || !itemDesc.value.trim() || weight.value <= 0) {
    uni.showToast({ title: '请填写所有必填项', icon: 'none' });
    return;
  }
  submitting.value = true;
  store.setDraft({
    typeCode: 'DELIVER',
    pickupAddress: { address: pickup.value },
    deliveryAddress: { address: delivery.value },
    urgentLevel: urgentLevels[urgentIndex.value],
    itemDesc: itemDesc.value,
    weight: weight.value,
  });
  uni.navigateTo({ url: '/pages/errand/quote/index' });
  submitting.value = false;
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
.field {
  margin-bottom: 16px;
}
.label {
  font-size: 14px;
  color: #555;
  display: block;
  margin-bottom: 4px;
}
.input,
.textarea,
.picker {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
}
.textarea {
  min-height: 60px;
}
.actions {
  margin-top: 24px;
}
</style>
