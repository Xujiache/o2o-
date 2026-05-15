<script setup lang="ts">
/**
 * GR-3 订单详情(GR-4 会进一步加"差额补付"卡片)
 */
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';

import {
  type GroceryOrderVo,
  cancelGroceryOrder,
  getGroceryOrder,
  statusLabel,
  statusTheme,
} from '@/api/grocery-orders';
import { prepay, simulatePayCallback } from '@/api/food-payments';

const order = ref<GroceryOrderVo | null>(null);
const loading = ref(true);
const orderId = ref('');

const canCancel = computed<boolean>(() => {
  if (!order.value) return false;
  return order.value.status === 'wait_pay' || order.value.status === 'paid';
});

const totalLabel = computed<string>(() => {
  if (!order.value) return '';
  return order.value.finalAmountCents !== null && order.value.finalAmountCents !== undefined ? '实付总价' : '预付估价';
});

function yuan(cents?: string | null): string {
  return (Number(cents ?? 0) / 100).toFixed(2);
}

function deltaText(delta?: string | null): { text: string; color: string } {
  const n = Number(delta ?? 0);
  if (n > 0) return { text: `补付 ¥ ${(n / 100).toFixed(2)}`, color: '#ff4d4f' };
  if (n < 0) return { text: `退款 ¥ ${(-n / 100).toFixed(2)}`, color: '#2e9c5d' };
  return { text: '无差额', color: '#5a6275' };
}

async function loadDetail(): Promise<void> {
  if (!orderId.value) return;
  loading.value = true;
  try {
    const r = await getGroceryOrder(orderId.value);
    if (r.code === '0' && r.data) {
      order.value = r.data;
    }
  } finally {
    loading.value = false;
  }
}

async function onCancel(): Promise<void> {
  uni.showModal({
    title: '取消订单',
    content: '确定取消该订单吗？',
    success: async (m) => {
      if (!m.confirm) return;
      const r = await cancelGroceryOrder(orderId.value);
      if (r.code === '0') {
        uni.showToast({ title: '已取消', icon: 'success' });
        void loadDetail();
      } else {
        uni.showToast({ title: r.message ?? '取消失败', icon: 'none' });
      }
    },
  });
}

async function payWithAmount(amountCents: number, label: string): Promise<void> {
  if (!order.value) return;
  uni.showLoading({ title: `调起${label}收银台...`, mask: true });
  try {
    const pre = await prepay({ bizType: 'GROCERY', orderId: order.value.orderId, payChannel: 'wxpay' });
    if (pre.code !== '0' || !pre.data) {
      uni.hideLoading();
      uni.showToast({ title: pre.message ?? '创建支付单失败', icon: 'none' });
      return;
    }
    await simulatePayCallback('wxpay', pre.data.payOrderNo, amountCents);
    uni.hideLoading();
    uni.showToast({ title: `${label}支付成功`, icon: 'success' });
    void loadDetail();
  } catch (e) {
    uni.hideLoading();
    const msg = e instanceof Error ? e.message : '支付失败';
    uni.showToast({ title: msg, icon: 'none' });
  }
}

async function onPay(): Promise<void> {
  if (!order.value) return;
  await payWithAmount(Number(order.value.estimatedAmountCents), '估价');
}

async function onPayDelta(): Promise<void> {
  if (!order.value || !order.value.weightDeltaCents) return;
  const delta = Number(order.value.weightDeltaCents);
  if (delta <= 0) return;
  await payWithAmount(delta, '差额');
}

const needPayDelta = computed<boolean>(() => {
  if (!order.value) return false;
  if (order.value.status !== 'weigh_settled') return false;
  return !!order.value.weightDeltaCents && Number(order.value.weightDeltaCents) > 0;
});

onLoad((q: Record<string, string | undefined>) => {
  orderId.value = q.orderId ?? '';
});
onShow(() => void loadDetail());
</script>

<template>
  <view class="detail">
    <view v-if="loading" class="detail__empty">加载中...</view>
    <template v-else-if="order">
      <view class="detail__hero">
        <text class="detail__status" :class="`detail__status--${statusTheme(order.status)}`">{{
          statusLabel(order.status)
        }}</text>
        <text class="detail__order-no">订单号 #{{ order.orderId }}</text>
      </view>

      <view v-if="order.pickupCode" class="detail__pickup-code">
        <text class="detail__pickup-code-label">自提码</text>
        <text class="detail__pickup-code-val">{{ order.pickupCode }}</text>
        <text class="detail__pickup-code-tip">到店出示给运营员核销</text>
      </view>

      <view v-if="order.pickupPointSnapshot" class="detail__card">
        <text class="detail__card-label">自提点</text>
        <text class="detail__card-name">{{ order.pickupPointSnapshot.name }}</text>
        <text class="detail__card-addr">{{ order.pickupPointSnapshot.address }}</text>
        <text v-if="order.pickupPointSnapshot.contactPhone" class="detail__card-phone">{{
          order.pickupPointSnapshot.contactPhone
        }}</text>
      </view>

      <view class="detail__card">
        <text class="detail__card-label">商品</text>
        <view v-for="it in order.items" :key="it.itemId" class="detail__item">
          <view class="detail__item-row">
            <text class="detail__item-name">
              {{ it.productNameSnapshot
              }}<text v-if="it.skuSpecSnapshot" class="detail__item-spec"> · {{ it.skuSpecSnapshot }}</text>
            </text>
            <text v-if="it.hasTraceability === 1" class="detail__item-badge">可溯源</text>
          </view>
          <view class="detail__item-row">
            <text v-if="it.isWeighted === 1" class="detail__item-info"
              >{{ it.portions }} 份 (预估 {{ (it.estimatedWeightGrams / 500).toFixed(2) }} 斤)</text
            >
            <text v-else class="detail__item-info">{{ it.portions }} {{ it.skuId ? '份' : '件' }}</text>
            <text class="detail__item-price">¥ {{ yuan(it.estimatedLineCents) }}</text>
          </view>
          <view
            v-if="it.isWeighted === 1 && it.finalWeightGrams !== null && it.finalWeightGrams !== undefined"
            class="detail__item-row detail__item-row--final"
          >
            <text class="detail__item-info">实重 {{ (it.finalWeightGrams / 500).toFixed(2) }} 斤</text>
            <text class="detail__item-price">¥ {{ yuan(it.finalLineCents) }}</text>
          </view>
        </view>
      </view>

      <view class="detail__card">
        <view class="detail__sum-row">
          <text class="detail__sum-label">{{ totalLabel }}</text>
          <text class="detail__sum-val">¥ {{ yuan(order.finalAmountCents ?? order.estimatedAmountCents) }}</text>
        </view>
        <view v-if="order.weightDeltaCents !== null && order.weightDeltaCents !== undefined" class="detail__sum-row">
          <text class="detail__sum-label">差额</text>
          <text class="detail__sum-val" :style="{ color: deltaText(order.weightDeltaCents).color }">{{
            deltaText(order.weightDeltaCents).text
          }}</text>
        </view>
        <view v-if="order.remark" class="detail__sum-row">
          <text class="detail__sum-label">备注</text>
          <text class="detail__sum-val" style="font-size: 26rpx; color: #5a6275">{{ order.remark }}</text>
        </view>
      </view>

      <view v-if="order.status === 'wait_pay'" class="detail__bar">
        <button class="detail__cta detail__cta--ghost" @click="onCancel">取消订单</button>
        <button class="detail__cta" @click="onPay">去支付 ¥ {{ yuan(order.estimatedAmountCents) }}</button>
      </view>
      <view v-else-if="needPayDelta" class="detail__bar">
        <button class="detail__cta" @click="onPayDelta">补付差额 ¥ {{ yuan(order.weightDeltaCents) }}</button>
      </view>
      <view v-else-if="canCancel" class="detail__bar">
        <button class="detail__cta detail__cta--ghost" @click="onCancel">取消订单</button>
      </view>
    </template>
    <view v-else class="detail__empty">订单不存在</view>
  </view>
</template>

<style scoped>
.detail {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 200rpx;
}
.detail__empty {
  padding: 200rpx 0;
  text-align: center;
  color: #94a3b8;
}
.detail__hero {
  padding: 56rpx 32rpx 40rpx;
  background: linear-gradient(135deg, #5fbe7d 0%, #2e9c5d 100%);
  color: #fff;
}
.detail__status {
  font-size: 48rpx;
  font-weight: 900;
}
.detail__status--warn {
  color: #ffe082;
}
.detail__status--err {
  color: #ffccc7;
}
.detail__order-no {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  opacity: 0.9;
}

.detail__pickup-code {
  margin: -28rpx 24rpx 0;
  padding: 28rpx;
  background: linear-gradient(135deg, #fff7ed, #fef3c7);
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.08);
}
.detail__pickup-code-label {
  font-size: 22rpx;
  color: #92400e;
}
.detail__pickup-code-val {
  font-size: 72rpx;
  font-weight: 900;
  color: #b45309;
  letter-spacing: 16rpx;
}
.detail__pickup-code-tip {
  font-size: 22rpx;
  color: #92400e;
}

.detail__card {
  margin: 16rpx 24rpx;
  padding: 24rpx 28rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.05);
}
.detail__card-label {
  font-size: 24rpx;
  color: #94a3b8;
  display: block;
  margin-bottom: 12rpx;
}
.detail__card-name {
  font-size: 30rpx;
  font-weight: 800;
  color: #172033;
  display: block;
}
.detail__card-addr {
  font-size: 24rpx;
  color: #5a6275;
  display: block;
  margin-top: 4rpx;
}
.detail__card-phone {
  font-size: 22rpx;
  color: #5b5ff8;
  display: block;
  margin-top: 4rpx;
}
.detail__item {
  padding: 16rpx 0;
  border-top: 1rpx solid rgba(23, 32, 51, 0.06);
}
.detail__item:first-child {
  border-top: none;
}
.detail__item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4rpx;
}
.detail__item-row--final {
  color: #2e9c5d;
}
.detail__item-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
}
.detail__item-spec {
  font-size: 24rpx;
  color: #92400e;
  font-weight: 600;
}
.detail__item-badge {
  padding: 4rpx 12rpx;
  background: #fff3e0;
  color: #ff8a00;
  font-size: 20rpx;
  border-radius: 999rpx;
}
.detail__item-info {
  font-size: 24rpx;
  color: #5a6275;
}
.detail__item-price {
  font-size: 28rpx;
  font-weight: 700;
  color: #ff4d4f;
}
.detail__sum-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 8rpx 0;
}
.detail__sum-label {
  font-size: 26rpx;
  color: #5a6275;
}
.detail__sum-val {
  font-size: 36rpx;
  font-weight: 900;
  color: #ff4d4f;
}

.detail__bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  background: #fff;
  display: flex;
  gap: 16rpx;
  box-shadow: 0 -10rpx 30rpx rgba(31, 41, 55, 0.05);
}
.detail__cta {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  color: #fff;
  font-weight: 700;
  border-radius: 999rpx;
  border: none;
}
.detail__cta--ghost {
  background: #fff;
  color: #5a6275;
  border: 1rpx solid #cbd5e1;
}
</style>
