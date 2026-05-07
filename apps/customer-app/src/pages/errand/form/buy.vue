<script setup lang="ts">
import { ref } from 'vue';

import { useErrandFormStore } from '@/stores/errand-form';

const store = useErrandFormStore();
const pickup = ref('');
const delivery = ref('');
const itemDesc = ref('');
const budget = ref(0);

const urgentRange = ['标准', '加急', '特急'];
const urgentLevels = ['standard', 'fast', 'express'] as const;
const urgentIndex = ref(0);
function onUrgentChange(e: { detail: { value: number } }): void {
  urgentIndex.value = e.detail.value;
}

const submitting = ref(false);

function submit(): void {
  if (!pickup.value.trim() || !delivery.value.trim() || !itemDesc.value.trim() || budget.value <= 0) {
    uni.showToast({ title: '请填写所有必填项', icon: 'none' });
    return;
  }
  submitting.value = true;
  store.setDraft({
    typeCode: 'BUY',
    pickupAddress: { address: pickup.value },
    deliveryAddress: { address: delivery.value },
    urgentLevel: urgentLevels[urgentIndex.value],
    itemDesc: itemDesc.value,
    budget: budget.value,
  });
  uni.navigateTo({ url: '/pages/errand/quote/index' });
  submitting.value = false;
}
</script>

<template>
  <view class="form">
    <view class="form__hero">
      <text class="form__eyebrow">代买跑腿</text>
      <text class="form__title">告诉骑手帮你买什么</text>
      <text class="form__subtitle">骑手垫付购买后送达,实际花费按预算上限内据实结算</text>
    </view>

    <view class="form__card">
      <view class="form__field">
        <view class="form__label"><text>取货地址</text><text class="form__required">*</text></view>
        <input v-model="pickup" placeholder="商家 / 取货点地址" class="form__input" />
      </view>
      <view class="form__field">
        <view class="form__label"><text>收货地址</text><text class="form__required">*</text></view>
        <input v-model="delivery" placeholder="收货地址" class="form__input" />
      </view>
      <view class="form__field">
        <view class="form__label"><text>物品描述</text><text class="form__required">*</text></view>
        <textarea v-model="itemDesc" placeholder="如:一杯冰美式、一盒草莓..." class="form__textarea" />
      </view>
      <view class="form__field">
        <view class="form__label"><text>预算上限(分)</text><text class="form__required">*</text></view>
        <input v-model.number="budget" type="number" placeholder="如:5000(=50 元)" class="form__input" />
      </view>
      <view class="form__field form__field--last">
        <view class="form__label"><text>紧急度</text></view>
        <picker :value="urgentIndex" :range="urgentRange" @change="onUrgentChange">
          <view class="form__picker">
            <text>{{ urgentRange[urgentIndex] }}</text>
            <text class="form__picker-arrow">›</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="form__bar">
      <button class="form__cta" :disabled="submitting" @click="submit">下一步:获取报价</button>
    </view>
  </view>
</template>

<style scoped>
.form {
  min-height: 100vh;
  padding: 0 0 200rpx;
  background: #f5f6f8;
}
.form__hero {
  position: relative;
  z-index: 1;
  padding: 40rpx 32rpx 56rpx;
  background: linear-gradient(135deg, #5b5ff8 0%, #00b8d9 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.form__eyebrow {
  font-size: 22rpx;
  letter-spacing: 1rpx;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  align-self: flex-start;
}
.form__title {
  font-size: 40rpx;
  font-weight: 800;
  margin-top: 18rpx;
}
.form__subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.86);
  line-height: 1.5;
}
.form__card {
  position: relative;
  z-index: 2;
  margin: -28rpx 24rpx 0;
  padding: 8rpx 28rpx;
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.08);
}
.form__field {
  padding: 24rpx 0;
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.06);
}
.form__field--last {
  border-bottom: none;
}
.form__label {
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: #5a6275;
  margin-bottom: 12rpx;
}
.form__required {
  color: #ff4d4f;
  margin-left: 4rpx;
}
.form__input,
.form__textarea {
  width: 100%;
  min-height: 80rpx;
  padding: 20rpx 24rpx;
  background: #f7f8fa;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #172033;
  box-sizing: border-box;
}
.form__textarea {
  min-height: 140rpx;
}
.form__picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 80rpx;
  padding: 20rpx 24rpx;
  background: #f7f8fa;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #172033;
  box-sizing: border-box;
}
.form__picker-arrow {
  color: #c5c9d2;
  font-size: 32rpx;
}
.form__bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 24rpx calc(env(safe-area-inset-bottom, 0rpx) + 24rpx);
  background: #f5f6f8;
  border-top: 1rpx solid rgba(31, 41, 55, 0.06);
  z-index: 50;
}
.form__cta {
  background: linear-gradient(135deg, #5b5ff8, #00b8d9);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: 999rpx;
  padding: 24rpx 0;
  box-shadow: 0 16rpx 40rpx rgba(91, 95, 248, 0.32);
}
.form__cta[disabled] {
  opacity: 0.5;
}
</style>
