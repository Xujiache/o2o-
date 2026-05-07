<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { computed, onMounted, ref } from 'vue';

import { getMerchantOrderDetail, type MerchantOrderDetailVo } from '@/api/merchant-orders';
import { useOrderStore } from '@/stores/order';
import { labelOrderStatus } from '@/utils/food-order-status';

const orderStore = useOrderStore();
const orderId = ref('');
const detail = ref<MerchantOrderDetailVo | null>(null);
const loading = ref(false);
const submitting = ref(false);
const showReject = ref(false);
const showReady = ref(false);
const rejectReason = ref('');
const readyRemark = ref('');

const allowedActions = computed<string[]>(() => detail.value?.allowedMerchantActions ?? []);
const canAccept = computed(() => allowedActions.value.includes('ACCEPT'));
const canReject = computed(() => allowedActions.value.includes('REJECT'));
const canReady = computed(() => allowedActions.value.includes('READY'));

function fmt(cents: string | number): string {
  return (Number(cents) / 100).toFixed(2);
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function load(): Promise<void> {
  if (!orderId.value) return;
  loading.value = true;
  try {
    const r = await getMerchantOrderDetail(orderId.value);
    if (r.code === '0' && r.data) {
      detail.value = r.data;
    } else {
      uni.showToast({ title: r.message ?? '加载失败', icon: 'none' });
    }
  } finally {
    loading.value = false;
  }
}

async function accept(): Promise<void> {
  submitting.value = true;
  try {
    const ok = await orderStore.accept(orderId.value);
    if (ok) {
      uni.showToast({ title: '已接单', icon: 'success' });
      await load();
    } else {
      uni.showToast({ title: '操作失败', icon: 'none' });
    }
  } finally {
    submitting.value = false;
  }
}

async function reject(): Promise<void> {
  if (!rejectReason.value.trim()) {
    uni.showToast({ title: '请填写拒单原因', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    const ok = await orderStore.reject(orderId.value, rejectReason.value.trim());
    if (ok) {
      uni.showToast({ title: '已拒单', icon: 'success' });
      showReject.value = false;
      rejectReason.value = '';
      await load();
    }
  } finally {
    submitting.value = false;
  }
}

async function markReady(): Promise<void> {
  submitting.value = true;
  try {
    const ok = await orderStore.markReady(orderId.value, readyRemark.value || undefined);
    if (ok) {
      uni.showToast({ title: '已出餐,等骑手取餐', icon: 'success' });
      showReady.value = false;
      readyRemark.value = '';
      await load();
    }
  } finally {
    submitting.value = false;
  }
}

onLoad((options) => {
  orderId.value = (options?.orderId as string) ?? '';
});

onMounted(load);
</script>

<template>
  <view class="md">
    <view v-if="loading && !detail" class="md__loading">加载中…</view>

    <template v-else-if="detail">
      <!-- 状态卡 -->
      <view class="md__status-card">
        <view class="md__status-text">{{ labelOrderStatus(detail.status) }}</view>
        <view class="md__order-no">订单号 {{ detail.orderNo }}</view>
        <view class="md__order-time">下单时间 {{ fmtTime(detail.createdAt) }}</view>
      </view>

      <!-- 收件信息 -->
      <view v-if="detail.address" class="md__card">
        <view class="md__card-h">收件地址</view>
        <view class="md__addr-row">
          <text class="md__addr-name">{{ detail.address.consignee }}</text>
          <text class="md__addr-mobile">{{ detail.address.mobileMasked }}</text>
        </view>
        <text class="md__addr-detail">{{ detail.address.detail }}</text>
      </view>

      <!-- 客户备注 -->
      <view v-if="detail.userRemark" class="md__card">
        <view class="md__card-h">客户备注</view>
        <text class="md__remark">{{ detail.userRemark }}</text>
      </view>

      <!-- 商品明细 -->
      <view class="md__card">
        <view class="md__card-h">商品明细 ({{ detail.items.length }} 项)</view>
        <view v-for="(it, idx) in detail.items" :key="it.skuId + idx" class="md__line">
          <text class="md__line-name">
            {{ it.name }}<text v-if="it.spec && it.spec !== '默认'" class="md__line-spec">{{ it.spec }}</text>
          </text>
          <text class="md__line-qty">× {{ it.quantity }}</text>
          <text class="md__line-sub">¥{{ fmt(it.subTotalCents) }}</text>
        </view>
      </view>

      <!-- 金额明细 -->
      <view class="md__card">
        <view class="md__amt"
          ><text>商品金额</text><text>¥{{ fmt(detail.goodsAmountCents) }}</text></view
        >
        <view class="md__amt"
          ><text>配送费</text><text>¥{{ fmt(detail.deliveryFeeCents) }}</text></view
        >
        <view v-if="Number(detail.discountAmountCents) > 0" class="md__amt">
          <text>优惠</text><text>-¥{{ fmt(detail.discountAmountCents) }}</text>
        </view>
        <view class="md__amt md__amt--total">
          <text>实收</text><text class="md__amt-pay">¥{{ fmt(detail.payableAmountCents) }}</text>
        </view>
      </view>

      <!-- 时间线 -->
      <view v-if="detail.timeline.length > 0" class="md__card">
        <view class="md__card-h">订单进度</view>
        <view v-for="(t, i) in detail.timeline" :key="i" class="md__t-row">
          <view class="md__t-dot" :class="{ 'md__t-dot--last': i === detail.timeline.length - 1 }" />
          <view class="md__t-main">
            <text class="md__t-name">{{ labelOrderStatus(t.toStatus) }}</text>
            <text class="md__t-time">{{ fmtTime(t.at) }} · {{ t.actor }}</text>
            <text v-if="t.reason" class="md__t-reason">原因: {{ t.reason }}</text>
          </view>
        </view>
      </view>

      <!-- 操作栏 -->
      <view v-if="canAccept || canReject || canReady" class="md__actions">
        <view v-if="canReject" class="md__btn md__btn--ghost" @tap="showReject = true">拒单</view>
        <view v-if="canAccept" class="md__btn md__btn--primary" @tap="accept">接单</view>
        <view v-if="canReady" class="md__btn md__btn--primary" @tap="showReady = true">出餐</view>
      </view>
      <view v-else class="md__actions-none">当前状态无可执行操作</view>

      <!-- 拒单对话框 -->
      <view v-if="showReject" class="md__dialog">
        <view class="md__mask" @tap="showReject = false" />
        <view class="md__modal">
          <view class="md__modal-h">拒单原因</view>
          <textarea
            class="md__modal-textarea"
            v-model="rejectReason"
            placeholder="请填写拒单原因(将退款给客户)"
            maxlength="255"
          />
          <view class="md__modal-btns">
            <view class="md__btn md__btn--ghost" @tap="showReject = false">取消</view>
            <view class="md__btn md__btn--danger" :class="{ 'md__btn--loading': submitting }" @tap="reject">
              {{ submitting ? '提交中…' : '确认拒单' }}
            </view>
          </view>
        </view>
      </view>

      <!-- 出餐对话框 -->
      <view v-if="showReady" class="md__dialog">
        <view class="md__mask" @tap="showReady = false" />
        <view class="md__modal">
          <view class="md__modal-h">出餐确认</view>
          <textarea
            class="md__modal-textarea"
            v-model="readyRemark"
            placeholder="可选备注(如:等骑手 5 分钟内来取)"
            maxlength="255"
          />
          <view class="md__modal-btns">
            <view class="md__btn md__btn--ghost" @tap="showReady = false">取消</view>
            <view class="md__btn md__btn--primary" :class="{ 'md__btn--loading': submitting }" @tap="markReady">
              {{ submitting ? '提交中…' : '确认出餐' }}
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.md {
  min-height: 100vh;
  padding: 24rpx 24rpx 200rpx;
  background: #f5f6f8;
}
.md__loading {
  text-align: center;
  padding: 120rpx 0;
  color: #8a94a6;
  font-size: 26rpx;
}

/* 状态卡 */
.md__status-card {
  background: linear-gradient(135deg, #1f2937, #b7791f);
  color: #fff;
  border-radius: 24rpx;
  padding: 36rpx 32rpx 28rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 18rpx 40rpx rgba(31, 41, 55, 0.24);
}
.md__status-text {
  font-size: 40rpx;
  font-weight: 700;
}
.md__order-no {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.78);
}
.md__order-time {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.66);
}

/* 卡片 */
.md__card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, 0.04);
}
.md__card-h {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
  margin-bottom: 16rpx;
}

/* 地址 */
.md__addr-row {
  display: flex;
  gap: 16rpx;
  align-items: baseline;
}
.md__addr-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #172033;
}
.md__addr-mobile {
  font-size: 26rpx;
  color: #5a6275;
}
.md__addr-detail {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #5a6275;
}
.md__remark {
  font-size: 26rpx;
  color: #5a6275;
}

/* 商品行 */
.md__line {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.05);
  font-size: 26rpx;
}
.md__line:last-child {
  border-bottom: 0;
}
.md__line-name {
  flex: 1;
  color: #172033;
}
.md__line-spec {
  color: #8a94a6;
  font-size: 22rpx;
  margin-left: 8rpx;
}
.md__line-qty {
  color: #8a94a6;
  font-size: 24rpx;
}
.md__line-sub {
  color: #b7791f;
  font-size: 26rpx;
  font-weight: 600;
}

/* 金额 */
.md__amt {
  display: flex;
  justify-content: space-between;
  font-size: 26rpx;
  color: #5a6275;
  padding: 8rpx 0;
}
.md__amt--total {
  margin-top: 12rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid rgba(31, 41, 55, 0.06);
  font-size: 30rpx;
  font-weight: 700;
  color: #172033;
}
.md__amt-pay {
  color: #d33;
  font-size: 36rpx;
}

/* 时间线 */
.md__t-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 12rpx 0;
  position: relative;
}
.md__t-row::before {
  content: '';
  position: absolute;
  left: 11rpx;
  top: 24rpx;
  bottom: -12rpx;
  width: 2rpx;
  background: rgba(183, 121, 31, 0.18);
}
.md__t-row:last-child::before {
  display: none;
}
.md__t-dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: rgba(183, 121, 31, 0.2);
  border: 4rpx solid #fff;
  box-shadow: 0 0 0 1rpx rgba(183, 121, 31, 0.4);
  margin-top: 8rpx;
  flex-shrink: 0;
}
.md__t-dot--last {
  background: linear-gradient(135deg, #b7791f, #ffb020);
  box-shadow:
    0 0 0 1rpx #b7791f,
    0 0 12rpx rgba(183, 121, 31, 0.4);
}
.md__t-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.md__t-name {
  font-size: 26rpx;
  color: #172033;
  font-weight: 600;
}
.md__t-time {
  font-size: 22rpx;
  color: #8a94a6;
}
.md__t-reason {
  font-size: 22rpx;
  color: #d33;
}

/* 操作 */
.md__actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 12rpx;
  padding: 16rpx 24rpx 32rpx;
  background: #fff;
  box-shadow: 0 -8rpx 24rpx rgba(31, 41, 55, 0.08);
}
.md__actions-none {
  text-align: center;
  font-size: 24rpx;
  color: #8a94a6;
  padding: 32rpx 0;
}
.md__btn {
  flex: 1;
  text-align: center;
  border-radius: 999rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  font-weight: 700;
}
.md__btn--ghost {
  background: #f5f6f8;
  color: #5a6275;
}
.md__btn--primary {
  background: linear-gradient(135deg, #ffb400, #b7791f);
  color: #fff;
}
.md__btn--danger {
  background: #d33;
  color: #fff;
}
.md__btn--loading {
  opacity: 0.7;
}

/* 对话框 */
.md__dialog {
  position: fixed;
  inset: 0;
  z-index: 99;
}
.md__mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
}
.md__modal {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  width: 84%;
  box-shadow: 0 24rpx 64rpx rgba(0, 0, 0, 0.24);
}
.md__modal-h {
  font-size: 32rpx;
  font-weight: 700;
  color: #172033;
  margin-bottom: 16rpx;
}
.md__modal-textarea {
  width: 100%;
  min-height: 160rpx;
  background: #f5f6f8;
  border-radius: 12rpx;
  padding: 18rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}
.md__modal-btns {
  display: flex;
  gap: 12rpx;
  margin-top: 20rpx;
}
</style>
