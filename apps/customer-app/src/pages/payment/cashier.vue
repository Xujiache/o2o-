<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { prepay } from '@/api/food-payments';
import { useFoodOrderStore } from '@/stores/food-order';
import { useFoodPaymentStore } from '@/stores/food-payment';

const orderStore = useFoodOrderStore();
const payStore = useFoodPaymentStore();
const orderId = ref('');
const countdown = ref(0);
const loading = ref(false);

const expireAt = computed(() => orderStore.submitted?.expireAt ?? 0);
const payable = computed(() => orderStore.submitted?.payableAmount ?? '0');

async function startPay(): Promise<void> {
  if (!orderId.value) return;
  loading.value = true;
  payStore.setPaying(true);
  try {
    const r = await prepay({
      bizType: 'FOOD',
      orderId: orderId.value,
      payChannel: orderStore.payChannel,
    });
    if (r.code === '0' && r.data) {
      payStore.setPrepay(r.data);
      // mock 唤起 SDK:本阶段直接模拟 success(stage 8 真接 wx.requestPayment)
      uni.showToast({ title: 'mock 支付中…', icon: 'loading' });
      setTimeout(() => {
        payStore.setResult('success');
        uni.redirectTo({ url: '/pages/payment/result?orderId=' + orderId.value });
      }, 800);
    } else {
      uni.showToast({ title: r.message ?? '支付失败', icon: 'none' });
      payStore.setPaying(false);
    }
  } finally {
    loading.value = false;
  }
}

function tickCountdown(): void {
  setInterval(() => {
    const remaining = Math.max(0, expireAt.value - Date.now());
    countdown.value = Math.floor(remaining / 1000);
  }, 1000);
}

onMounted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts = (uni as any).getLaunchOptionsSync?.() ?? {};
  orderId.value = (opts.query?.orderId ?? orderStore.submitted?.orderId ?? '') as string;
  tickCountdown();
});
</script>

<template>
  <view class="cashier">
    <view class="cashier__title">支付收银台</view>
    <view class="cashier__amount">¥ {{ Number(payable) / 100 }}</view>
    <view class="cashier__countdown"
      >剩余支付 {{ Math.floor(countdown / 60) }}:{{ String(countdown % 60).padStart(2, '0') }}</view
    >
    <view class="cashier__channel">
      <text>支付方式:{{ orderStore.payChannel === 'wxpay' ? '微信' : '支付宝' }}</text>
    </view>
    <button type="primary" :loading="loading" @tap="startPay">立即支付</button>
  </view>
</template>

<style scoped>
.cashier {
  padding: 40rpx;
  text-align: center;
}
.cashier__title {
  font-size: 32rpx;
  font-weight: 600;
}
.cashier__amount {
  font-size: 60rpx;
  color: #ff6633;
  font-weight: 700;
  margin: 40rpx 0;
}
.cashier__countdown {
  color: #888;
  margin-bottom: 20rpx;
}
.cashier__channel {
  margin-bottom: 40rpx;
}
</style>
