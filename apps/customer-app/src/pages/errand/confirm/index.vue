<template>
  <view class="page">
    <text class="title">确认订单</text>
    <view v-if="!quote">报价已失效,请返回重试</view>
    <view v-else>
      <view class="row total">
        <text class="label">应付金额</text>
        <text class="value">¥{{ formatYuan(quote.payableAmount) }}</text>
      </view>
      <view class="field">
        <text class="label">备注</text>
        <textarea v-model="remark" placeholder="可选" class="textarea" />
      </view>
      <view class="field">
        <text class="label">支付方式</text>
        <picker :value="payIndex" :range="payRange" @change="onPayChange">
          <view class="picker">{{ payRange[payIndex] }}</view>
        </picker>
      </view>
      <view v-if="quote.prohibitedWarnings.length > 0" class="warnings">
        <text>违禁品提示已确认,继续将提交订单</text>
      </view>
      <view class="actions">
        <button :disabled="submitting" @click="submit">提交订单并支付</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { submitErrand } from '@/api/errand-orders';
import { useErrandQuoteStore } from '@/stores/errand-quote';
import { formatYuan } from '@/utils/format-price';

const quoteStore = useErrandQuoteStore();
const quote = ref(quoteStore.current);
const remark = ref('');
const submitting = ref(false);

const payRange = ['微信支付', '支付宝'];
const payChannels = ['wxpay', 'alipay'] as const;
const payIndex = ref(0);
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
  const r = await submitErrand({
    quoteId: quote.value.quoteId,
    payChannel: payChannels[payIndex.value],
    remark: remark.value || undefined,
  });
  submitting.value = false;
  if (r.code === '0' && r.data) {
    uni.redirectTo({
      url: `/pages/payment/cashier?bizType=ERRAND&orderId=${r.data.orderId}&payOrderId=${r.data.payOrderId}`,
    });
  } else {
    uni.showToast({ title: r.message ?? '提交失败', icon: 'none' });
  }
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
.field {
  margin-top: 16px;
}
.textarea,
.picker {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
}
.warnings {
  margin-top: 16px;
  padding: 10px;
  background: #fff8e1;
  border-radius: 6px;
  font-size: 13px;
}
.actions {
  margin-top: 24px;
}
</style>
