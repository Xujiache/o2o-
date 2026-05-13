<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import {
  cancelGroceryOrder,
  getGroceryOrder,
  prepayGrocery,
  type GroceryOrderDetail,
  type GroceryOrderStatus,
} from '@/api/grocery-orders';
import { simulatePayCallback } from '@/api/food-payments';
import { formatYuan } from '@/utils/format-price';

const detail = ref<GroceryOrderDetail | null>(null);
const orderId = ref('');
const paying = ref(false);
const cancelling = ref(false);

const STATUS_LABEL: Record<GroceryOrderStatus, string> = {
  WAIT_PAY: '待支付',
  PAID_WAIT_PICKUP: '待自提',
  SETTLING: '称重结算中',
  DIFF_PAYING: '差价待补付',
  PICKED_UP: '已提货',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

const statusToneClass = computed(() => {
  if (!detail.value) return '';
  const s = detail.value.status;
  if (s === 'WAIT_PAY' || s === 'DIFF_PAYING') return 'hero--warn';
  if (s === 'COMPLETED' || s === 'PICKED_UP') return 'hero--ok';
  if (s === 'CANCELLED') return 'hero--mute';
  return 'hero--active';
});

const showPickupCode = computed(() => {
  if (!detail.value) return false;
  const s = detail.value.status;
  return (s === 'PAID_WAIT_PICKUP' || s === 'SETTLING' || s === 'DIFF_PAYING') && !!detail.value.pickupCode;
});

const showDiffPay = computed(() => detail.value?.status === 'DIFF_PAYING');

const diffAmountAbs = computed(() => {
  if (!detail.value?.diffAmount) return '0';
  const n = Number(detail.value.diffAmount);
  return String(Math.abs(n));
});

const qrImageUrl = computed(() => {
  const payload = detail.value?.pickupQrPayload;
  if (!payload) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(payload)}`;
});

function fmtCode(c: string | null): string {
  if (!c) return '';
  return c.replace(/(\d{3})(\d{3})/, '$1 $2');
}

function fmtSlot(date: string, start: number, end: number): string {
  const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return `${date} ${fmt(start)} - ${fmt(end)}`;
}

function fmtTime(ts: number | null | undefined): string {
  if (!ts) return '--';
  const d = new Date(ts);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(
    d.getHours(),
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getQuery(): string {
  const pages = (getCurrentPages?.() ?? []) as Array<{ options?: { orderId?: string } }>;
  return pages[pages.length - 1]?.options?.orderId ?? '';
}

async function load(): Promise<void> {
  orderId.value = getQuery();
  if (!orderId.value) return;
  const r = await getGroceryOrder(orderId.value);
  if (r.code === '0' && r.data) detail.value = r.data;
}

async function onPay(): Promise<void> {
  if (!detail.value || paying.value) return;
  paying.value = true;
  try {
    const r = await prepayGrocery(orderId.value);
    if (r.code !== '0' || !r.data) {
      uni.showToast({ title: r.message ?? '支付下单失败', icon: 'none' });
      return;
    }
    await simulatePayCallback('wxpay', r.data.payOrderNo, Number(detail.value.estimatedPayableAmount));
    uni.showToast({ title: '支付成功', icon: 'success' });
    await load();
  } catch (e) {
    uni.showToast({ title: '支付失败', icon: 'none' });
  } finally {
    paying.value = false;
  }
}

async function onDiffPay(): Promise<void> {
  if (!detail.value || paying.value) return;
  paying.value = true;
  try {
    const r = await prepayGrocery(orderId.value);
    if (r.code !== '0' || !r.data) {
      uni.showToast({ title: r.message ?? '差价下单失败', icon: 'none' });
      return;
    }
    await simulatePayCallback('wxpay', r.data.payOrderNo, Number(diffAmountAbs.value));
    uni.showToast({ title: '补付成功', icon: 'success' });
    await load();
  } catch (e) {
    uni.showToast({ title: '补付失败', icon: 'none' });
  } finally {
    paying.value = false;
  }
}

async function onCancel(): Promise<void> {
  if (!detail.value || cancelling.value) return;
  const r = await uni.showModal({ title: '取消订单', content: '确认取消该订单吗？' });
  if (!r.confirm) return;
  cancelling.value = true;
  try {
    await cancelGroceryOrder(orderId.value);
    await load();
  } finally {
    cancelling.value = false;
  }
}

onMounted(load);
</script>

<template>
  <view class="page">
    <view v-if="!detail" class="loading">加载中...</view>
    <template v-else>
      <view class="hero" :class="statusToneClass">
        <text class="hero__status">{{ STATUS_LABEL[detail.status] }}</text>
        <text class="hero__order">订单号 {{ detail.orderNo }}</text>
      </view>

      <view v-if="showPickupCode" class="code-card">
        <text class="code-card__label">提货码</text>
        <text class="code-card__value">{{ fmtCode(detail.pickupCode) }}</text>
        <view v-if="qrImageUrl" class="code-card__qr">
          <image class="code-card__qr-img" :src="qrImageUrl" mode="aspectFit" />
        </view>
        <text class="code-card__hint">出示给自提员核销;请勿向陌生人泄露</text>
      </view>

      <view v-if="showDiffPay" class="diff-card">
        <view class="diff-card__head">
          <SvgIcon name="alert-triangle" :size="32" color="#ff6b35" />
          <text class="diff-card__title">需补付差价</text>
        </view>
        <text class="diff-card__amount">¥{{ formatYuan(diffAmountAbs) }}</text>
        <text class="diff-card__hint">实际称重金额高于预估,请补付差额完成提货</text>
        <button class="diff-card__btn" :disabled="paying" :loading="paying" @tap="onDiffPay">
          {{ paying ? '处理中...' : '立即补付' }}
        </button>
      </view>

      <view class="card">
        <text class="card__title">自提信息</text>
        <view class="row"
          ><text>自提时段</text
          ><text>{{ fmtSlot(detail.pickupDate, detail.pickupStartMinute, detail.pickupEndMinute) }}</text></view
        >
        <view class="row"
          ><text>下单时间</text><text>{{ fmtTime(detail.createdAt) }}</text></view
        >
        <view v-if="detail.paidAt" class="row"
          ><text>支付时间</text><text>{{ fmtTime(detail.paidAt) }}</text></view
        >
        <view v-if="detail.pickedUpAt" class="row"
          ><text>提货时间</text><text>{{ fmtTime(detail.pickedUpAt) }}</text></view
        >
      </view>

      <view class="card">
        <text class="card__title">商品明细</text>
        <view v-for="it in detail.items" :key="it.groceryOrderItemId" class="item">
          <view class="item__image">
            <image
              v-if="it.coverImageFileId"
              class="item__img"
              :src="`/api/v1/pub/files/${it.coverImageFileId}`"
              mode="aspectFill"
            />
            <view v-else class="item__placeholder">
              <SvgIcon name="apple" :size="40" color="#c5c9d2" />
            </view>
          </view>
          <view class="item__main">
            <view class="item__head">
              <text class="item__name">{{ it.productName }}</text>
              <view v-if="it.pricingMode === 'weighed'" class="item__chip">称重</view>
            </view>
            <text v-if="it.pricingMode === 'weighed'" class="item__unit">
              单价 ¥{{ formatYuan(it.unitPrice) }} /斤
            </text>
            <text v-else class="item__unit">单价 ¥{{ formatYuan(it.unitPrice) }} /份</text>
            <view class="item__qty-row">
              <view class="item__qty-block">
                <text class="item__qty-label">预估</text>
                <text class="item__qty-value">
                  {{ it.pricingMode === 'weighed' ? `${it.estimatedQuantity} g` : `× ${it.estimatedQuantity}` }}
                </text>
              </view>
              <view v-if="it.actualQuantity != null" class="item__qty-block">
                <text class="item__qty-label">实际</text>
                <text class="item__qty-value item__qty-value--actual">
                  {{ it.pricingMode === 'weighed' ? `${it.actualQuantity} g` : `× ${it.actualQuantity}` }}
                </text>
              </view>
              <view class="item__qty-block item__qty-block--price">
                <text class="item__qty-label">{{ it.actualSubtotal ? '实付' : '预估' }}</text>
                <text class="item__qty-value item__qty-value--price">
                  ¥{{ formatYuan(it.actualSubtotal ?? it.estimatedSubtotal) }}
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="card">
        <text class="card__title">费用明细</text>
        <view class="row"
          ><text>预估商品金额</text><text>¥{{ formatYuan(detail.estimatedGoodsAmount) }}</text></view
        >
        <view class="row"
          ><text>优惠抵扣</text><text>-¥{{ formatYuan(detail.discountAmount) }}</text></view
        >
        <view class="row"
          ><text>预估应付</text><text>¥{{ formatYuan(detail.estimatedPayableAmount) }}</text></view
        >
        <view v-if="detail.finalGoodsAmount" class="row"
          ><text>实际商品金额</text><text>¥{{ formatYuan(detail.finalGoodsAmount) }}</text></view
        >
        <view v-if="detail.diffAmount" class="row">
          <text>差价</text>
          <text
            :class="{ 'row__diff-pos': Number(detail.diffAmount) > 0, 'row__diff-neg': Number(detail.diffAmount) < 0 }"
          >
            {{ Number(detail.diffAmount) > 0 ? '+' : '' }}¥{{ formatYuan(detail.diffAmount) }}
          </text>
        </view>
        <view class="row row--total"
          ><text>{{ detail.finalPayableAmount ? '实付应付' : '预估应付' }}</text
          ><text>¥{{ formatYuan(detail.finalPayableAmount ?? detail.estimatedPayableAmount) }}</text></view
        >
      </view>

      <view class="action-bar">
        <template v-if="detail.status === 'WAIT_PAY'">
          <button class="action-bar__btn action-bar__btn--ghost" :disabled="cancelling" @tap="onCancel">
            取消订单
          </button>
          <button class="action-bar__btn action-bar__btn--primary" :disabled="paying" :loading="paying" @tap="onPay">
            {{ paying ? '支付中...' : '立即支付' }}
          </button>
        </template>
        <template v-else-if="showDiffPay">
          <button
            class="action-bar__btn action-bar__btn--primary"
            :disabled="paying"
            :loading="paying"
            @tap="onDiffPay"
          >
            {{ paying ? '处理中...' : `补付 ¥${formatYuan(diffAmountAbs)}` }}
          </button>
        </template>
        <template v-else>
          <button class="action-bar__btn action-bar__btn--primary" @tap="load">刷新</button>
        </template>
      </view>
    </template>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx 24rpx 200rpx;
  box-sizing: border-box;
  background: #fafbfc;
}
.loading {
  padding: 200rpx 0;
  text-align: center;
  color: #8a94a6;
}
.hero {
  padding: 34rpx 30rpx;
  border-radius: 24rpx;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  box-shadow: 0 18rpx 42rpx rgba(91, 95, 248, 0.22);
}
.hero--active {
  background: linear-gradient(135deg, #11998e, #38ef7d);
}
.hero--warn {
  background: linear-gradient(135deg, #ff7a45, #ffb020);
}
.hero--ok {
  background: linear-gradient(135deg, #38ef7d, #11998e);
}
.hero--mute {
  background: linear-gradient(135deg, #c5c9d2, #8a94a6);
}
.hero__status {
  font-size: 40rpx;
  font-weight: 800;
}
.hero__order {
  font-size: 23rpx;
  color: rgba(255, 255, 255, 0.86);
}

.code-card {
  margin-top: 18rpx;
  padding: 28rpx 24rpx;
  background: #fff;
  border-radius: 22rpx;
  box-shadow: 0 14rpx 32rpx rgba(31, 41, 55, 0.06);
  text-align: center;
}
.code-card__label {
  display: block;
  font-size: 22rpx;
  color: #8a94a6;
  margin-bottom: 8rpx;
}
.code-card__value {
  display: block;
  font-family: Menlo, Consolas, monospace;
  font-size: 80rpx;
  font-weight: 800;
  letter-spacing: 12rpx;
  color: #172033;
}
.code-card__qr {
  margin: 22rpx auto 14rpx;
  width: 360rpx;
  height: 360rpx;
  padding: 18rpx;
  background: #fff;
  border-radius: 22rpx;
  border: 2rpx solid #f0f2f6;
}
.code-card__qr-img {
  width: 100%;
  height: 100%;
}
.code-card__hint {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #8a94a6;
}

.diff-card {
  margin-top: 18rpx;
  padding: 26rpx 26rpx 30rpx;
  background: linear-gradient(135deg, #fff5ee, #fff);
  border: 2rpx solid rgba(255, 107, 53, 0.4);
  border-radius: 22rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  align-items: flex-start;
}
.diff-card__head {
  display: flex;
  gap: 12rpx;
  align-items: center;
}
.diff-card__title {
  font-size: 30rpx;
  font-weight: 800;
  color: #ff6b35;
}
.diff-card__amount {
  font-size: 56rpx;
  font-weight: 800;
  color: #ff6b35;
}
.diff-card__hint {
  font-size: 23rpx;
  color: #8a94a6;
}
.diff-card__btn {
  align-self: stretch;
  margin-top: 14rpx;
  height: 82rpx;
  border-radius: 999rpx;
  background: #ff6b35;
  color: #fff;
  font-size: 28rpx;
  font-weight: 800;
}

.card {
  margin-top: 18rpx;
  padding: 24rpx 26rpx;
  background: #fff;
  border-radius: 22rpx;
  box-shadow: 0 10rpx 24rpx rgba(31, 41, 55, 0.05);
}
.card__title {
  display: block;
  font-size: 28rpx;
  font-weight: 800;
  color: #172033;
  margin-bottom: 14rpx;
}
.row {
  display: flex;
  justify-content: space-between;
  padding: 10rpx 0;
  color: #5a6275;
  font-size: 26rpx;
}
.row text:last-child {
  color: #172033;
}
.row--total {
  margin-top: 10rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f2f6;
  font-size: 30rpx;
  font-weight: 800;
}
.row--total text:last-child {
  color: #ff6b35;
}
.row__diff-pos {
  color: #ff6b35 !important;
}
.row__diff-neg {
  color: #11998e !important;
}

.item {
  display: flex;
  gap: 18rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f2f6;
}
.item:last-child {
  border-bottom: none;
}
.item__image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 14rpx;
  overflow: hidden;
  background: #f0f2f6;
  flex-shrink: 0;
}
.item__img,
.item__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.item__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}
.item__head {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.item__name {
  flex: 1;
  font-size: 26rpx;
  font-weight: 700;
  color: #172033;
}
.item__chip {
  padding: 2rpx 12rpx;
  font-size: 20rpx;
  background: rgba(91, 95, 248, 0.12);
  color: #5b5ff8;
  border-radius: 999rpx;
}
.item__unit {
  font-size: 22rpx;
  color: #8a94a6;
}
.item__qty-row {
  margin-top: 8rpx;
  display: flex;
  gap: 18rpx;
  align-items: baseline;
}
.item__qty-block {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}
.item__qty-block--price {
  margin-left: auto;
  align-items: flex-end;
}
.item__qty-label {
  font-size: 20rpx;
  color: #8a94a6;
}
.item__qty-value {
  font-size: 24rpx;
  font-weight: 700;
  color: #172033;
}
.item__qty-value--actual {
  color: #11998e;
}
.item__qty-value--price {
  color: #ff6b35;
  font-size: 26rpx;
}

.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 18rpx 24rpx calc(env(safe-area-inset-bottom, 0rpx) + 18rpx);
  display: flex;
  gap: 14rpx;
  background: #fff;
  box-shadow: 0 -8rpx 24rpx rgba(31, 41, 55, 0.08);
}
.action-bar__btn {
  flex: 1;
  height: 82rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 800;
}
.action-bar__btn--ghost {
  background: #f5f6f8;
  color: #5a6275;
}
.action-bar__btn--primary {
  background: #11998e;
  color: #fff;
}
</style>
