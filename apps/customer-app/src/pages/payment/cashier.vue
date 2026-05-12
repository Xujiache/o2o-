<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { computed, onMounted, onUnmounted, ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import { getOrderDetail, type OrderDetailVo } from '@/api/food-orders';
import { prepay, simulatePayCallback } from '@/api/food-payments';
import { formatYuan } from '@/utils/format-price';
import { useFoodOrderStore } from '@/stores/food-order';
import { useFoodPaymentStore } from '@/stores/food-payment';

const orderStore = useFoodOrderStore();
const payStore = useFoodPaymentStore();
const orderId = ref('');
const countdown = ref(0);
const loading = ref(false);
const order = ref<OrderDetailVo | null>(null);
const orderLoading = ref(false);

const payableCents = computed<number>(() => {
  if (order.value?.payableAmount) return Number(order.value.payableAmount);
  if (orderStore.submitted?.payableAmount) return Number(orderStore.submitted.payableAmount);
  return 0;
});
const expireAt = computed<number>(() => {
  if (order.value?.expireAt) return order.value.expireAt;
  if (orderStore.submitted?.expireAt) return orderStore.submitted.expireAt;
  return 0;
});
const itemCount = computed<number>(() => order.value?.items?.reduce((s, it) => s + it.quantity, 0) ?? 0);

async function loadOrder(): Promise<void> {
  if (!orderId.value) return;
  orderLoading.value = true;
  try {
    const r = await getOrderDetail(orderId.value);
    if (r.code === '0' && r.data) {
      order.value = r.data;
      // 已支付/已取消等非待支付状态,跳详情页避免重复支付
      if (r.data.status !== 'WAIT_PAY') {
        uni.showToast({ title: '订单已不可支付', icon: 'none' });
        setTimeout(() => uni.redirectTo({ url: '/pages/food/order/detail?orderId=' + orderId.value }), 800);
      }
    } else {
      uni.showToast({ title: r.message ?? '订单加载失败', icon: 'none' });
    }
  } finally {
    orderLoading.value = false;
  }
}

async function startPay(): Promise<void> {
  if (!orderId.value || payableCents.value === 0) return;
  loading.value = true;
  payStore.setPaying(true);
  try {
    const r = await prepay({
      bizType: 'FOOD',
      orderId: orderId.value,
      payChannel: orderStore.payChannel,
    });
    if (r.code !== '0' || !r.data) {
      uni.showToast({ title: r.message ?? '支付失败', icon: 'none' });
      payStore.setPaying(false);
      return;
    }
    payStore.setPrepay(r.data);
    uni.showToast({ title: '支付处理中…', icon: 'loading' });

    try {
      await simulatePayCallback(orderStore.payChannel, r.data.payOrderNo, payableCents.value);
      payStore.setResult('success');
    } catch (err) {
      payStore.setResult('fail');
      uni.showToast({ title: err instanceof Error ? err.message : '回调失败', icon: 'none' });
    }
    uni.redirectTo({ url: '/pages/payment/result?orderId=' + orderId.value });
  } finally {
    loading.value = false;
  }
}

let countdownTimer: ReturnType<typeof setInterval> | null = null;
function tickCountdown(): void {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    const remaining = Math.max(0, expireAt.value - Date.now());
    countdown.value = Math.floor(remaining / 1000);
  }, 1000);
}

onLoad((options) => {
  orderId.value = ((options?.orderId as string) ?? orderStore.submitted?.orderId ?? '') as string;
});

onMounted(async () => {
  tickCountdown();
  await loadOrder();
});

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer);
});
</script>

<template>
  <view class="cashier">
    <view class="cashier__hero">
      <text class="cashier__hero-label">应付金额</text>
      <view class="cashier__amount">
        <text class="cashier__amount-symbol">¥</text>
        <text class="cashier__amount-num">{{ formatYuan(payableCents) }}</text>
      </view>
      <view v-if="countdown > 0" class="cashier__countdown">
        剩余支付时间 {{ Math.floor(countdown / 60) }}:{{ String(countdown % 60).padStart(2, '0') }}
      </view>
      <view v-else-if="orderLoading" class="cashier__countdown">加载中…</view>
    </view>

    <view v-if="order" class="cashier__card">
      <view class="cashier__row">
        <text class="cashier__row-label">订单号</text>
        <text class="cashier__row-value">{{ order.orderNo }}</text>
      </view>
      <view class="cashier__row">
        <text class="cashier__row-label">商品</text>
        <text class="cashier__row-value">共 {{ itemCount }} 件</text>
      </view>
      <view class="cashier__row">
        <text class="cashier__row-label">商品金额</text>
        <text class="cashier__row-value">¥{{ formatYuan(order.goodsAmount) }}</text>
      </view>
      <view class="cashier__row">
        <text class="cashier__row-label">配送费</text>
        <text class="cashier__row-value">¥{{ formatYuan(order.deliveryFee) }}</text>
      </view>
    </view>

    <view class="cashier__card">
      <view class="cashier__row-label">支付方式</view>
      <view class="cashier__channels">
        <view
          class="cashier__channel"
          :class="{ 'cashier__channel--active': orderStore.payChannel === 'wxpay' }"
          @tap="orderStore.setPayChannel('wxpay')"
        >
          <SvgIcon name="wechat" :size="32" color="#07c160" />
          <text>微信支付</text>
        </view>
        <view
          class="cashier__channel"
          :class="{ 'cashier__channel--active': orderStore.payChannel === 'alipay' }"
          @tap="orderStore.setPayChannel('alipay')"
        >
          <SvgIcon name="alipay" :size="32" color="#1677ff" />
          <text>支付宝</text>
        </view>
      </view>
    </view>

    <button class="cashier__pay" :loading="loading" :disabled="loading || payableCents === 0" @tap="startPay">
      {{ loading ? '支付中…' : `立即支付 ¥${formatYuan(payableCents)}` }}
    </button>
  </view>
</template>

<style scoped>
.cashier {
  min-height: 100vh;
  padding: 24rpx;
  background: #fff;
}

.cashier__hero {
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  color: #fff;
  border-radius: 28rpx;
  padding: 56rpx 32rpx 36rpx;
  margin-bottom: 16rpx;
  text-align: center;
  box-shadow: 0 18rpx 40rpx rgba(255, 107, 53, 0.24);
}
.cashier__hero-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.84);
}
.cashier__amount {
  margin-top: 12rpx;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8rpx;
}
.cashier__amount-symbol {
  font-size: 36rpx;
  font-weight: 600;
}
.cashier__amount-num {
  font-size: 84rpx;
  font-weight: 800;
  letter-spacing: -2rpx;
}
.cashier__countdown {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.88);
}

.cashier__card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, 0.04);
}
.cashier__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.05);
  font-size: 26rpx;
}
.cashier__row:last-child {
  border-bottom: 0;
}
.cashier__row-label {
  color: #5a6275;
}
.cashier__row-value {
  color: #172033;
  font-weight: 500;
}

.cashier__channels {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}
.cashier__channel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  background: #fff;
  font-size: 26rpx;
  color: #5a6275;
  border: 2rpx solid transparent;
}
.cashier__channel-icon {
  font-size: 30rpx;
}
.cashier__channel--active {
  border-color: #ff7a45;
  background: rgba(255, 122, 69, 0.08);
  color: #ff6b35;
  font-weight: 600;
}

.cashier__pay {
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  color: #fff;
  border-radius: 999rpx;
  height: 96rpx;
  line-height: 96rpx;
  font-size: 32rpx;
  font-weight: 700;
  margin-top: 32rpx;
  box-shadow: 0 18rpx 40rpx rgba(255, 107, 53, 0.32);
}
.cashier__pay[disabled] {
  background: #c5c9d2;
  color: #fff;
  box-shadow: none;
}
</style>
