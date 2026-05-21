<script setup lang="ts">
import { onMounted, ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import { useErrandFormStore } from '@/stores/errand-form';
import { useErrandQuoteStore } from '@/stores/errand-quote';
import { formatYuan } from '@/utils/format-price';
import NavBar from '@/components/common/NavBar.vue';

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

<template>
  <view class="quote">
    <NavBar mode="float" color="#ffffff" />
    <view v-if="loading" class="quote__loading">报价计算中…</view>
    <view v-else-if="!quote" class="quote__error">
      <SvgIcon name="alert-triangle" :size="80" color="#d33" />
      <text class="quote__error-title">报价获取失败</text>
      <text class="quote__error-msg">请返回上一页重新提交</text>
    </view>

    <template v-else>
      <!-- 大额头 -->
      <view class="quote__hero">
        <text class="quote__eyebrow">本次费用</text>
        <text class="quote__amount">¥{{ formatYuan(quote.payableAmount) }}</text>
        <view class="quote__hero-meta">
          <text class="quote__hero-meta-item">距离 {{ quote.distanceMeters }} m</text>
        </view>
      </view>

      <!-- 价格分项 -->
      <view class="quote__card">
        <text class="quote__card-title">费用明细</text>
        <view class="quote__row">
          <text class="quote__row-label">基础费</text>
          <text class="quote__row-value">¥{{ formatYuan(quote.baseFee) }}</text>
        </view>
        <view class="quote__row">
          <text class="quote__row-label">距离费</text>
          <text class="quote__row-value">¥{{ formatYuan(quote.distanceFee) }}</text>
        </view>
        <view class="quote__row">
          <text class="quote__row-label">加急 / 重量费</text>
          <text class="quote__row-value">¥{{ formatYuan(quote.urgentFee) }}</text>
        </view>
        <view class="quote__row quote__row--total">
          <text class="quote__row-label">应付总额</text>
          <text class="quote__row-pay">¥{{ formatYuan(quote.payableAmount) }}</text>
        </view>
      </view>

      <!-- 违禁品提示 -->
      <view v-if="quote.prohibitedWarnings.length > 0" class="quote__warn">
        <view class="quote__warn-head">
          <SvgIcon name="alert-triangle" :size="28" color="#d33" />
          <text class="quote__warn-title">违禁品提示</text>
        </view>
        <view v-for="w in quote.prohibitedWarnings" :key="w.keyword" class="quote__warn-item">
          <text class="quote__warn-keyword">{{ w.keyword }}</text>
          <text class="quote__warn-desc">{{ w.description }}</text>
        </view>
      </view>

      <view class="quote__bar">
        <button class="quote__cta" @click="goConfirm">下一步:确认下单</button>
      </view>
    </template>
  </view>
</template>

<style scoped>
.quote {
  min-height: 100vh;
  padding: 0 0 200rpx;
  background: #fff;
}
.quote__loading,
.quote__error {
  text-align: center;
  padding: 160rpx 40rpx;
  color: var(--text-muted);
  font-size: 26rpx;
}
.quote__error {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  align-items: center;
}
.quote__error-icon {
  font-size: 96rpx;
}
.quote__error-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-primary);
}
.quote__error-msg {
  font-size: 24rpx;
  color: var(--text-muted);
}

.quote__hero {
  padding: 60rpx 32rpx 80rpx;
  background: var(--brand-gradient);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.quote__eyebrow {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.86);
  letter-spacing: 1rpx;
}
.quote__amount {
  font-size: 96rpx;
  font-weight: 800;
  letter-spacing: -2rpx;
  line-height: 1;
}
.quote__hero-meta {
  margin-top: 8rpx;
  display: flex;
  gap: 12rpx;
}
.quote__hero-meta-item {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.86);
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
}

.quote__card {
  margin: -36rpx 24rpx 0;
  padding: 32rpx 28rpx 16rpx;
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.08);
}
.quote__card-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8rpx;
}
.quote__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.06);
}
.quote__row:last-child {
  border-bottom: none;
}
.quote__row--total {
  padding-top: 24rpx;
  margin-top: 8rpx;
  border-top: 2rpx solid rgba(31, 41, 55, 0.08);
  border-bottom: none;
}
.quote__row-label {
  font-size: 26rpx;
  color: var(--text-secondary);
}
.quote__row-value {
  font-size: 28rpx;
  color: var(--text-primary);
  font-weight: 600;
}
.quote__row--total .quote__row-label {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-primary);
}
.quote__row-pay {
  font-size: 40rpx;
  font-weight: 800;
  color: var(--price-color);
}

.quote__warn {
  margin: 24rpx;
  padding: 24rpx 28rpx;
  background: linear-gradient(135deg, #fff8e1, #ffefc7);
  border-radius: 24rpx;
}
.quote__warn-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.quote__warn-icon {
  font-size: 32rpx;
}
.quote__warn-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #ad6800;
}
.quote__warn-item {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  padding: 12rpx 0;
  border-top: 1rpx solid rgba(173, 104, 0, 0.12);
}
.quote__warn-keyword {
  font-size: 24rpx;
  font-weight: 700;
  color: #ad6800;
}
.quote__warn-desc {
  font-size: 22rpx;
  color: #8c4a00;
  line-height: 1.4;
}

.quote__bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 24rpx calc(env(safe-area-inset-bottom, 0rpx) + 24rpx);
  background: #fff;
  backdrop-filter: blur(12rpx);
  z-index: 50;
}
.quote__cta {
  background: var(--brand-gradient);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: 999rpx;
  padding: 24rpx 0;
  box-shadow: 0 16rpx 40rpx rgba(46, 156, 93, 0.32);
}
</style>
