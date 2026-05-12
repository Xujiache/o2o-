<script setup lang="ts">
import { computed, ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import { submitErrand } from '@/api/errand-orders';
import { prepay, simulatePayCallback } from '@/api/food-payments';
import { useErrandQuoteStore } from '@/stores/errand-quote';
import { formatYuan } from '@/utils/format-price';

const quoteStore = useErrandQuoteStore();
const quote = ref(quoteStore.current);
const remark = ref('');
const submitting = ref(false);

const payRange = ['微信支付', '支付宝'];
const payChannels = ['wxpay', 'alipay'] as const;
const payIndex = ref(0);
const selectedPayChannel = computed(() => payChannels[payIndex.value] ?? 'wxpay');
function onPayChange(e: { detail: { value: number } }): void {
  payIndex.value = e.detail.value;
}

async function submit(): Promise<void> {
  if (!quote.value) return;
  if (quoteStore.isExpired()) {
    uni.showToast({ title: '报价已过期', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    const r = await submitErrand({
      quoteId: quote.value.quoteId,
      payChannel: selectedPayChannel.value,
      remark: remark.value || undefined,
    });
    if (r.code !== '0' || !r.data) {
      uni.showToast({ title: r.message ?? '提交失败', icon: 'none' });
      return;
    }
    const orderId = r.data.orderId;

    uni.showToast({ title: '提交成功,支付中…', icon: 'loading' });
    const p = await prepay({
      bizType: 'ERRAND',
      orderId,
      payChannel: selectedPayChannel.value,
    });
    if (p.code !== '0' || !p.data) {
      uni.showToast({ title: '请到订单详情完成支付', icon: 'none' });
      setTimeout(() => uni.redirectTo({ url: `/pages/errand/order/detail?orderId=${orderId}` }), 1000);
      return;
    }

    const payable = Number(quote.value.payableAmount);
    try {
      await simulatePayCallback(selectedPayChannel.value, p.data.payOrderNo, payable);
      uni.showToast({ title: '支付成功', icon: 'success' });
    } catch (err) {
      uni.showToast({
        title: err instanceof Error ? err.message : '回调失败',
        icon: 'none',
      });
    }

    setTimeout(() => uni.redirectTo({ url: `/pages/errand/order/detail?orderId=${orderId}` }), 800);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="confirm">
    <view v-if="!quote" class="confirm__error">
      <text class="confirm__error-icon">⏰</text>
      <text class="confirm__error-title">报价已失效</text>
      <text class="confirm__error-msg">请返回重新获取报价</text>
    </view>

    <template v-else>
      <!-- 应付金额 -->
      <view class="confirm__hero">
        <text class="confirm__eyebrow">应付金额</text>
        <text class="confirm__amount">¥{{ formatYuan(quote.payableAmount) }}</text>
      </view>

      <!-- 备注 + 支付方式 -->
      <view class="confirm__card">
        <view class="confirm__field">
          <view class="confirm__label"><text>订单备注</text></view>
          <textarea v-model="remark" placeholder="可选,如有特殊说明请告知骑手..." class="confirm__textarea" />
        </view>
        <view class="confirm__field confirm__field--last">
          <view class="confirm__label"><text>支付方式</text></view>
          <picker :value="payIndex" :range="payRange" @change="onPayChange">
            <view class="confirm__picker">
              <text>{{ payRange[payIndex] }}</text>
              <text class="confirm__picker-arrow">›</text>
            </view>
          </picker>
        </view>
      </view>

      <!-- 违禁品提示二次确认 -->
      <view v-if="quote.prohibitedWarnings.length > 0" class="confirm__warn">
        <SvgIcon name="alert-triangle" :size="28" color="#d33" />
        <text class="confirm__warn-text">违禁品提示已确认,继续将提交订单</text>
      </view>

      <view class="confirm__bar">
        <view class="confirm__bar-info">
          <text class="confirm__bar-label">实付</text>
          <text class="confirm__bar-amount">¥{{ formatYuan(quote.payableAmount) }}</text>
        </view>
        <button class="confirm__cta" :disabled="submitting" @click="submit">
          {{ submitting ? '提交中…' : '提交订单并支付' }}
        </button>
      </view>
    </template>
  </view>
</template>

<style scoped>
.confirm {
  min-height: 100vh;
  padding: 0 0 200rpx;
  background: #fff;
}
.confirm__error {
  text-align: center;
  padding: 160rpx 40rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  align-items: center;
}
.confirm__error-icon {
  font-size: 96rpx;
}
.confirm__error-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #172033;
}
.confirm__error-msg {
  font-size: 24rpx;
  color: #8a94a6;
}

.confirm__hero {
  position: relative;
  z-index: 1;
  padding: 60rpx 32rpx 80rpx;
  background: linear-gradient(135deg, #5b5ff8 0%, #00b8d9 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.confirm__eyebrow {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.86);
  letter-spacing: 1rpx;
}
.confirm__amount {
  font-size: 96rpx;
  font-weight: 800;
  letter-spacing: -2rpx;
  line-height: 1;
}

.confirm__card {
  position: relative;
  z-index: 2;
  margin: -36rpx 24rpx 0;
  padding: 8rpx 28rpx;
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.08);
}
.confirm__field {
  padding: 24rpx 0;
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.06);
}
.confirm__field--last {
  border-bottom: none;
}
.confirm__label {
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: #5a6275;
  margin-bottom: 12rpx;
}
.confirm__textarea {
  width: 100%;
  padding: 20rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #172033;
  min-height: 120rpx;
  box-sizing: border-box;
}
.confirm__picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 80rpx;
  padding: 20rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #172033;
  box-sizing: border-box;
}
.confirm__picker-arrow {
  color: #c5c9d2;
  font-size: 32rpx;
}

.confirm__warn {
  margin: 24rpx;
  padding: 20rpx 24rpx;
  background: linear-gradient(135deg, #fff8e1, #ffefc7);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.confirm__warn-icon {
  font-size: 28rpx;
}
.confirm__warn-text {
  font-size: 24rpx;
  color: #ad6800;
  flex: 1;
}

.confirm__bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx calc(env(safe-area-inset-bottom, 0rpx) + 16rpx);
  background: #fff;
  border-top: 1rpx solid rgba(31, 41, 55, 0.06);
  z-index: 50;
}
.confirm__bar-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.confirm__bar-label {
  font-size: 22rpx;
  color: #8a94a6;
}
.confirm__bar-amount {
  font-size: 36rpx;
  font-weight: 800;
  color: #ff4d4f;
}
.confirm__cta {
  background: linear-gradient(135deg, #5b5ff8, #00b8d9);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: 999rpx;
  padding: 22rpx 48rpx;
  box-shadow: 0 16rpx 40rpx rgba(91, 95, 248, 0.32);
}
.confirm__cta[disabled] {
  opacity: 0.6;
}
</style>
