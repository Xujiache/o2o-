<script setup lang="ts">
/**
 * GR-4 拣货+称重+结算+核销一体页(运营员侧)
 */
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';

import { isOk } from '@o2o/contracts';

import {
  type PickingDetailVo,
  type PickingItemVo,
  cancelForOOS,
  getPickingDetail,
  markReady,
  settleOrder,
  startPicking,
  statusLabel,
  verifyPickup,
  weighItem,
} from '@/api/grocery-orders';

const orderId = ref('');
const order = ref<PickingDetailVo | null>(null);
const loading = ref(true);
const weighing = ref<Record<string, number>>({});
const codeInput = ref('');

const allWeighed = computed<boolean>(() => {
  if (!order.value) return false;
  return order.value.items.every((it) => it.finalWeightGrams !== null && it.finalWeightGrams !== undefined);
});

function yuan(cents?: string | null): string {
  return (Number(cents ?? 0) / 100).toFixed(2);
}

function deltaDesc(delta?: string | null): { text: string; cls: string } {
  const n = Number(delta ?? 0);
  if (n > 0) return { text: `补付 ¥ ${(n / 100).toFixed(2)}`, cls: 'detail__delta--up' };
  if (n < 0) return { text: `退款 ¥ ${(-n / 100).toFixed(2)}`, cls: 'detail__delta--down' };
  return { text: '无差额', cls: '' };
}

async function loadDetail(): Promise<void> {
  loading.value = true;
  try {
    const r = await getPickingDetail(orderId.value);
    if (isOk(r)) {
      order.value = r.data;
      const next: Record<string, number> = {};
      for (const it of r.data.items) {
        next[it.itemId] = it.finalWeightGrams ?? it.estimatedWeightGrams;
      }
      weighing.value = next;
    } else {
      uni.showToast({ title: r.message ?? '加载失败', icon: 'none' });
    }
  } finally {
    loading.value = false;
  }
}

async function onStart(): Promise<void> {
  const r = await startPicking(orderId.value);
  if (isOk(r)) {
    uni.showToast({ title: '开始拣货', icon: 'success' });
    void loadDetail();
  } else {
    uni.showToast({ title: r.message ?? '失败', icon: 'none' });
  }
}

async function onWeigh(it: PickingItemVo): Promise<void> {
  const g = weighing.value[it.itemId];
  if (!g || g <= 0) {
    uni.showToast({ title: '请输入正数克数', icon: 'none' });
    return;
  }
  const r = await weighItem(orderId.value, it.itemId, Math.round(g));
  if (isOk(r)) {
    uni.showToast({ title: '已录入', icon: 'success' });
    void loadDetail();
  } else {
    uni.showToast({ title: r.message ?? '录入失败', icon: 'none' });
  }
}

async function onSettle(): Promise<void> {
  if (!allWeighed.value) {
    uni.showToast({ title: '请先称完全部商品', icon: 'none' });
    return;
  }
  const r = await settleOrder(orderId.value);
  if (isOk(r)) {
    uni.showToast({ title: '已结算', icon: 'success' });
    void loadDetail();
  } else {
    uni.showToast({ title: r.message ?? '结算失败', icon: 'none' });
  }
}

async function onMarkReady(): Promise<void> {
  const r = await markReady(orderId.value);
  if (isOk(r) && r.data?.pickupCode) {
    uni.showModal({
      title: '自提码已生成',
      content: `自提码:${r.data.pickupCode}\n请告知顾客凭码自提`,
      showCancel: false,
    });
    void loadDetail();
  } else {
    uni.showToast({ title: r.message ?? '失败', icon: 'none' });
  }
}

async function onVerify(): Promise<void> {
  if (!codeInput.value) {
    uni.showToast({ title: '请输入自提码', icon: 'none' });
    return;
  }
  const r = await verifyPickup(orderId.value, codeInput.value.trim());
  if (isOk(r)) {
    uni.showToast({ title: '核销成功', icon: 'success' });
    codeInput.value = '';
    void loadDetail();
  } else {
    uni.showToast({ title: r.message ?? '核销失败', icon: 'none' });
  }
}

async function onCancelOOS(): Promise<void> {
  uni.showModal({
    title: '缺货全退',
    content: '订单会被退款,库存回滚。确定继续吗？',
    success: async (m) => {
      if (!m.confirm) return;
      const r = await cancelForOOS(orderId.value, '缺货取消');
      if (isOk(r)) {
        uni.showToast({ title: '已退款', icon: 'success' });
        void loadDetail();
      } else {
        uni.showToast({ title: r.message ?? '失败', icon: 'none' });
      }
    },
  });
}

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
        <text class="detail__status">{{ statusLabel(order.status) }}</text>
        <text class="detail__num">订单 #{{ order.orderId }}</text>
      </view>

      <view v-if="order.pickupPointSnapshot" class="detail__card">
        <text class="detail__card-label">自提点</text>
        <text class="detail__card-val"
          >{{ order.pickupPointSnapshot.name }} · {{ order.pickupPointSnapshot.address }}</text
        >
      </view>

      <view class="detail__card">
        <text class="detail__card-label">商品 · {{ order.items.length }} 项</text>
        <view v-for="it in order.items" :key="it.itemId" class="detail__item">
          <view class="detail__item-head">
            <text class="detail__item-name">{{ it.productNameSnapshot }}</text>
            <view v-if="it.hasTraceability === 1" class="detail__item-badge">可溯源</view>
          </view>
          <text class="detail__item-info"
            >{{ it.portions }} 份 · 预估 {{ it.estimatedWeightGrams }} g ≈
            {{ (it.estimatedWeightGrams / 500).toFixed(2) }} 斤</text
          >
          <text class="detail__item-info"
            >单价 ¥ {{ (Number(it.unitPriceCentsPerJin) / 100).toFixed(2) }} /斤 · 预估金额 ¥
            {{ yuan(it.estimatedLineCents) }}</text
          >

          <view v-if="order.status === 'picking'" class="detail__weigh">
            <input
              v-model.number="weighing[it.itemId]"
              type="number"
              class="detail__weigh-input"
              placeholder="实际克数"
            />
            <button class="detail__weigh-btn" @click="onWeigh(it)">
              {{ it.finalWeightGrams !== null && it.finalWeightGrams !== undefined ? '修正' : '录入' }}
            </button>
          </view>

          <view v-if="it.finalWeightGrams !== null && it.finalWeightGrams !== undefined" class="detail__final">
            <text>实重 {{ it.finalWeightGrams }} g = ¥ {{ yuan(it.finalLineCents) }}</text>
          </view>
        </view>
      </view>

      <view class="detail__sum">
        <view class="detail__sum-row"
          ><text>预付估价</text><text>¥ {{ yuan(order.estimatedAmountCents) }}</text></view
        >
        <view v-if="order.finalAmountCents" class="detail__sum-row"
          ><text>实际总价</text><text>¥ {{ yuan(order.finalAmountCents) }}</text></view
        >
        <view v-if="order.weightDeltaCents !== null && order.weightDeltaCents !== undefined" class="detail__sum-row">
          <text>差额</text>
          <text :class="deltaDesc(order.weightDeltaCents).cls">{{ deltaDesc(order.weightDeltaCents).text }}</text>
        </view>
      </view>

      <view v-if="order.pickupCode" class="detail__code-card">
        <text class="detail__code-label">自提码</text>
        <text class="detail__code-val">{{ order.pickupCode }}</text>
      </view>

      <view class="detail__bar">
        <button v-if="order.status === 'paid'" class="detail__cta" @click="onStart">开始拣货</button>
        <button v-if="order.status === 'picking'" class="detail__cta detail__cta--alt" @click="onCancelOOS">
          缺货退款
        </button>
        <button v-if="order.status === 'picking' && allWeighed" class="detail__cta" @click="onSettle">结算差额</button>
        <button v-if="order.status === 'weigh_settled'" class="detail__cta" @click="onMarkReady">
          装箱完成 · 生成自提码
        </button>
      </view>

      <view v-if="order.status === 'pickup_ready'" class="detail__verify">
        <text class="detail__verify-label">核销自提码</text>
        <view class="detail__verify-row">
          <input v-model="codeInput" class="detail__verify-input" placeholder="请输入或扫码" />
          <button class="detail__verify-btn" @click="onVerify">核销</button>
        </view>
      </view>
    </template>
    <view v-else class="detail__empty">订单不存在</view>
  </view>
</template>

<style scoped>
.detail {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 220rpx;
}
.detail__empty {
  padding: 200rpx 0;
  text-align: center;
  color: #94a3b8;
}
.detail__hero {
  padding: 40rpx 32rpx;
  background: linear-gradient(135deg, #b7791f, #d97706);
  color: #fff;
}
.detail__status {
  font-size: 48rpx;
  font-weight: 900;
}
.detail__num {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  opacity: 0.9;
}
.detail__card {
  margin: 16rpx 24rpx;
  padding: 24rpx 28rpx;
  background: #fff;
  border-radius: 24rpx;
}
.detail__card-label {
  font-size: 22rpx;
  color: #94a3b8;
  display: block;
  margin-bottom: 12rpx;
}
.detail__card-val {
  font-size: 28rpx;
  color: #172033;
}
.detail__item {
  padding: 16rpx 0;
  border-top: 1rpx solid rgba(23, 32, 51, 0.06);
}
.detail__item:first-child {
  border-top: none;
}
.detail__item-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6rpx;
}
.detail__item-name {
  font-size: 30rpx;
  font-weight: 700;
}
.detail__item-badge {
  padding: 4rpx 12rpx;
  background: #fff3e0;
  color: #ff8a00;
  font-size: 20rpx;
  border-radius: 999rpx;
}
.detail__item-info {
  display: block;
  font-size: 24rpx;
  color: #5a6275;
  margin-top: 4rpx;
}
.detail__weigh {
  display: flex;
  gap: 12rpx;
  margin-top: 12rpx;
}
.detail__weigh-input {
  flex: 1;
  padding: 10rpx 16rpx;
  background: #f1f5f9;
  border-radius: 12rpx;
  font-size: 28rpx;
}
.detail__weigh-btn {
  padding: 0 24rpx;
  background: #3b82f6;
  color: #fff;
  border-radius: 12rpx;
  border: none;
  font-size: 24rpx;
}
.detail__final {
  margin-top: 8rpx;
  padding: 8rpx 16rpx;
  background: #ecfdf5;
  color: #2e9c5d;
  font-size: 22rpx;
  font-weight: 700;
  border-radius: 12rpx;
}
.detail__sum {
  margin: 16rpx 24rpx;
  padding: 24rpx 28rpx;
  background: #fff;
  border-radius: 24rpx;
}
.detail__sum-row {
  display: flex;
  justify-content: space-between;
  padding: 6rpx 0;
  font-size: 28rpx;
  color: #172033;
}
.detail__delta--up {
  color: #ff4d4f;
  font-weight: 800;
}
.detail__delta--down {
  color: #2e9c5d;
  font-weight: 800;
}
.detail__code-card {
  margin: 16rpx 24rpx;
  padding: 28rpx;
  background: linear-gradient(135deg, #fff7ed, #fef3c7);
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.detail__code-label {
  font-size: 22rpx;
  color: #92400e;
}
.detail__code-val {
  font-size: 72rpx;
  font-weight: 900;
  color: #b45309;
  letter-spacing: 16rpx;
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
.detail__cta--alt {
  background: #fff;
  color: #ff4d4f;
  border: 1rpx solid #ff4d4f;
}
.detail__verify {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  background: #fff;
  box-shadow: 0 -10rpx 30rpx rgba(31, 41, 55, 0.05);
}
.detail__verify-label {
  display: block;
  font-size: 22rpx;
  color: #94a3b8;
  margin-bottom: 8rpx;
}
.detail__verify-row {
  display: flex;
  gap: 12rpx;
}
.detail__verify-input {
  flex: 1;
  padding: 16rpx 20rpx;
  background: #f1f5f9;
  border-radius: 16rpx;
  font-size: 32rpx;
  letter-spacing: 8rpx;
  text-align: center;
}
.detail__verify-btn {
  padding: 0 32rpx;
  background: #2e9c5d;
  color: #fff;
  border-radius: 16rpx;
  border: none;
  font-weight: 700;
}
</style>
