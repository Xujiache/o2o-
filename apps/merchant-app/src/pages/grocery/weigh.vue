<script setup lang="ts">
/**
 * 商城称重页 — 核销后进入,逐项录入实际克数
 *
 * 流程:
 *  1) onLoad 读 orderId,再次 verify 拿到订单/items(避免页面刷新丢上下文)
 *     -- 用 pickupCode 不行,这里改用 orderId 直接复用 verify(传 qrPayload 模拟?)
 *     实际:核销时 verify 已返回订单,本页通过路由 query 仅拿到 orderId,
 *     需要再次拿订单数据;后端没暴露"按 orderId 查询订单",但 verify 是幂等的
 *     (5s idempotent),且 status 已变 SETTLING,verify 会复用现状返回。
 *     考虑到鲁棒性,本页 onLoad 只渲染从 verify 页携带的快照(stash);若刷新则提示返回。
 *  2) 用户逐项输入 actualG → 调 /m/pickup/weigh(可分批),实时显示小计
 *  3) 全部录入后点击"确认结算"→ /m/pickup/weigh/confirm
 *     - AUTO_DONE / AUTO_REFUND:直接出货,返回核销页
 *     - NEEDS_DIFF_PAY:跳 diff-wait 等待补付
 */
import { onLoad, onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';

import { confirmSettle, type VerifiedOrderItemVo, type VerifyPickupVo, verifyPickup, weighItems } from '@/api/grocery';
import SvgIcon from '@/components/common/SvgIcon.vue';

const orderId = ref('');
const orderNo = ref('');
const order = ref<VerifyPickupVo | null>(null);
const loading = ref(false);
const submitting = ref(false);

// 用户输入的实际克数(以 weighed item 的 orderItemId 为 key)
const inputG = ref<Record<string, number>>({});
// 已成功录入服务端的小计(actualSubtotal)
const recordedSubtotalCents = ref<Record<string, number>>({});
// 已录入的克数(用于判断是否需要再提交)
const recordedG = ref<Record<string, number>>({});

onLoad((opts) => {
  orderId.value = (opts?.orderId as string) ?? '';
  orderNo.value = (opts?.orderNo as string) ?? '';
  if (!orderId.value) {
    uni.showToast({ title: '订单参数缺失', icon: 'none' });
    return;
  }
  // 用户从 verify 跳来时本地 storage 会缓存订单快照;若直接刷新本页,需要返回核销页重扫。
  hydrateFromStash();
});

onShow(() => uni.hideTabBar({ animation: false }));

/** verify 页跳来前在 storage 暂存订单快照,本页读取 */
function hydrateFromStash(): void {
  try {
    const raw = uni.getStorageSync(`o2o:m:grocery:order:${orderId.value}`);
    if (raw && typeof raw === 'string') {
      const parsed = JSON.parse(raw) as VerifyPickupVo;
      order.value = parsed;
      // 初始化已录入字段
      for (const it of parsed.items) {
        if (it.actualQuantity != null) {
          recordedG.value[it.groceryOrderItemId] = it.actualQuantity;
          inputG.value[it.groceryOrderItemId] = it.actualQuantity;
          if (it.actualSubtotal != null) {
            recordedSubtotalCents.value[it.groceryOrderItemId] = Number(it.actualSubtotal);
          }
        }
      }
    }
  } catch {
    // 解析失败容忍
  }
}

const weighedItems = computed<VerifiedOrderItemVo[]>(() => {
  return (order.value?.items ?? []).filter((it) => it.pricingMode === 'weighed');
});

const fixedItems = computed<VerifiedOrderItemVo[]>(() => {
  return (order.value?.items ?? []).filter((it) => it.pricingMode === 'fixed');
});

const allWeighed = computed<boolean>(() => {
  return weighedItems.value.every((it) => (recordedG.value[it.groceryOrderItemId] ?? 0) > 0);
});

/** 实时合计 = 已录入称重小计 + 全部 fixed 行小计 */
const liveTotalCents = computed<number>(() => {
  let total = 0;
  for (const it of fixedItems.value) {
    total += Number(it.estimatedSubtotal);
  }
  for (const it of weighedItems.value) {
    const sub = recordedSubtotalCents.value[it.groceryOrderItemId];
    if (sub != null) {
      total += sub;
    } else {
      // 未录入:用预估值
      total += Number(it.estimatedSubtotal);
    }
  }
  return total;
});

function fmtYuan(cents: string | number): string {
  return (Number(cents) / 100).toFixed(2);
}

function unitLabel(unit: VerifiedOrderItemVo['weightUnit']): string {
  if (unit === 'jin') return '元/斤';
  if (unit === 'kg') return '元/公斤';
  if (unit === 'g') return '元/克';
  return '';
}

function onWeightInput(itemId: string, e: Event): void {
  const v = (e as unknown as { detail: { value: string } }).detail?.value ?? '';
  const num = Number(v);
  if (Number.isFinite(num) && num >= 0) {
    inputG.value[itemId] = Math.round(num);
  } else {
    inputG.value[itemId] = 0;
  }
}

async function submitOne(item: VerifiedOrderItemVo): Promise<void> {
  const g = inputG.value[item.groceryOrderItemId] ?? 0;
  if (g <= 0) {
    uni.showToast({ title: '请输入大于 0 的克数', icon: 'none' });
    return;
  }
  if (submitting.value) return;
  submitting.value = true;
  try {
    const r = await weighItems({
      groceryOrderId: orderId.value,
      items: [{ groceryOrderItemId: item.groceryOrderItemId, actualG: g }],
    });
    if (r.code !== '0' || !r.data) return;
    const row = r.data.items.find((x) => x.groceryOrderItemId === item.groceryOrderItemId);
    if (row) {
      recordedG.value[item.groceryOrderItemId] = row.actualQuantity;
      recordedSubtotalCents.value[item.groceryOrderItemId] = Number(row.actualSubtotal);
    }
    uni.showToast({ title: '已录入', icon: 'success' });
  } finally {
    submitting.value = false;
  }
}

async function submitAll(): Promise<void> {
  if (submitting.value) return;
  const items: Array<{ groceryOrderItemId: string; actualG: number }> = [];
  for (const it of weighedItems.value) {
    const g = inputG.value[it.groceryOrderItemId] ?? 0;
    if (g > 0) {
      items.push({ groceryOrderItemId: it.groceryOrderItemId, actualG: g });
    }
  }
  if (items.length === 0) {
    uni.showToast({ title: '请先录入克数', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    const r = await weighItems({ groceryOrderId: orderId.value, items });
    if (r.code !== '0' || !r.data) return;
    const data = r.data;
    for (const row of data.items) {
      recordedG.value[row.groceryOrderItemId] = row.actualQuantity;
      recordedSubtotalCents.value[row.groceryOrderItemId] = Number(row.actualSubtotal);
    }
    uni.showToast({ title: '已批量录入', icon: 'success' });
  } finally {
    submitting.value = false;
  }
}

async function onConfirm(): Promise<void> {
  if (!allWeighed.value) {
    uni.showToast({ title: '还有称重项未录入', icon: 'none' });
    return;
  }
  if (submitting.value) return;
  submitting.value = true;
  try {
    const r = await confirmSettle(orderId.value);
    if (r.code !== '0' || !r.data) return;
    const data = r.data;
    const action = data.action;
    if (action === 'AUTO_DONE') {
      uni.showToast({ title: '已完成 · 可出货', icon: 'success' });
      setTimeout(() => uni.switchTab({ url: '/pages/grocery/verify' }), 800);
    } else if (action === 'AUTO_REFUND') {
      const refundYuan = (Math.abs(Number(data.diffAmount)) / 100).toFixed(2);
      uni.showModal({
        title: '已自动退差',
        content: `已自动为客户退款 ¥${refundYuan},请直接出货。`,
        showCancel: false,
        success: () => uni.switchTab({ url: '/pages/grocery/verify' }),
      });
    } else if (action === 'NEEDS_DIFF_PAY') {
      const diffYuan = (Number(data.diffAmount) / 100).toFixed(2);
      uni.showModal({
        title: '需客户补付',
        content: `客户需补付 ¥${diffYuan},通知客户在 APP 完成补付后再交付。`,
        showCancel: false,
        success: () => {
          uni.redirectTo({
            url: `/pages/grocery/diff-wait?orderId=${orderId.value}&diff=${data.diffAmount}`,
          });
        },
      });
    }
  } finally {
    submitting.value = false;
  }
}

function onCancel(): void {
  uni.navigateBack({ delta: 1 });
}
</script>

<template>
  <view class="weigh">
    <!-- 顶部 -->
    <view class="weigh__head">
      <view class="weigh__head-l">
        <text class="weigh__title">称重结算</text>
        <text class="weigh__sub" v-if="order">订单 {{ order.orderNo }}</text>
        <text class="weigh__sub" v-else-if="orderNo">订单 {{ orderNo }}</text>
      </view>
    </view>

    <view v-if="!order" class="weigh__empty">
      <SvgIcon name="alert-triangle" :size="80" color="#c0392b" />
      <text>页面已刷新,请返回核销页重新扫码</text>
      <view class="weigh__btn weigh__btn--ghost" @tap="onCancel">
        <text>返回</text>
      </view>
    </view>

    <template v-else>
      <!-- 实时小计 -->
      <view class="weigh__total">
        <text class="weigh__total-label">实时小计</text>
        <view class="weigh__total-row">
          <text class="weigh__total-sym">¥</text>
          <text class="weigh__total-num">{{ fmtYuan(liveTotalCents) }}</text>
        </view>
        <text class="weigh__total-est">预估 ¥{{ fmtYuan(order.estimatedPayableAmount) }}</text>
      </view>

      <!-- 称重项 -->
      <view v-if="weighedItems.length > 0" class="weigh__panel">
        <view class="weigh__panel-head">
          <view class="weigh__panel-bar" />
          <text class="weigh__panel-title">称重商品(共 {{ weighedItems.length }} 项)</text>
        </view>
        <view v-for="it in weighedItems" :key="it.groceryOrderItemId" class="weigh__row">
          <view class="weigh__row-l">
            <text class="weigh__row-name">{{ it.productName }}</text>
            <text class="weigh__row-meta">
              {{ fmtYuan(it.unitPrice) }} {{ unitLabel(it.weightUnit) }} · 预估 {{ it.estimatedQuantity }} g
            </text>
            <text v-if="recordedG[it.groceryOrderItemId]" class="weigh__row-recorded">
              已录入 {{ recordedG[it.groceryOrderItemId] }} g · 小计 ¥{{
                fmtYuan(recordedSubtotalCents[it.groceryOrderItemId] ?? 0)
              }}
            </text>
          </view>
          <view class="weigh__row-r">
            <view class="weigh__row-inputbox">
              <input
                class="weigh__row-input"
                type="number"
                placeholder="克"
                :value="inputG[it.groceryOrderItemId] ?? ''"
                @input="onWeightInput(it.groceryOrderItemId, $event)"
              />
              <text class="weigh__row-unit">g</text>
            </view>
            <view
              class="weigh__row-btn"
              :class="{
                'weigh__row-btn--done': (recordedG[it.groceryOrderItemId] ?? 0) > 0,
              }"
              @tap="submitOne(it)"
            >
              <text>{{ (recordedG[it.groceryOrderItemId] ?? 0) > 0 ? '重录' : '录入' }}</text>
            </view>
          </view>
        </view>
        <view class="weigh__batch" @tap="submitAll">
          <SvgIcon name="check" :size="20" color="#b7791f" />
          <text>批量提交全部克数</text>
        </view>
      </view>

      <!-- 定价项 (不需称重) -->
      <view v-if="fixedItems.length > 0" class="weigh__panel">
        <view class="weigh__panel-head">
          <view class="weigh__panel-bar" />
          <text class="weigh__panel-title">定价商品(共 {{ fixedItems.length }} 项)</text>
        </view>
        <view v-for="it in fixedItems" :key="it.groceryOrderItemId" class="weigh__row weigh__row--fixed">
          <view class="weigh__row-l">
            <text class="weigh__row-name">{{ it.productName }}</text>
            <text class="weigh__row-meta">{{ fmtYuan(it.unitPrice) }} × {{ it.estimatedQuantity }}</text>
          </view>
          <text class="weigh__row-fixed-sub">¥{{ fmtYuan(it.estimatedSubtotal) }}</text>
        </view>
      </view>

      <!-- 底部确认条 -->
      <view class="weigh__foot">
        <view class="weigh__btn weigh__btn--ghost" @tap="onCancel">
          <text>取消</text>
        </view>
        <view
          class="weigh__btn weigh__btn--primary"
          :class="{ 'weigh__btn--disabled': !allWeighed || submitting }"
          @tap="onConfirm"
        >
          <text>{{ submitting ? '处理中…' : '确认结算' }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.weigh {
  min-height: 100vh;
  padding: 24rpx 24rpx 220rpx;
  background: #f5f6f8;
}
.weigh__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4rpx;
}
.weigh__head-l {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.weigh__title {
  font-size: 36rpx;
  font-weight: 800;
  color: #172033;
}
.weigh__sub {
  font-size: 22rpx;
  color: #8a94a6;
}

.weigh__empty {
  margin-top: 80rpx;
  padding: 60rpx 30rpx;
  background: #fff;
  border-radius: 14rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
  color: #8a94a6;
  font-size: 24rpx;
}

/* 实时小计 */
.weigh__total {
  margin-top: 18rpx;
  padding: 28rpx;
  background: linear-gradient(135deg, #1f2937 0%, #b7791f 100%);
  border-radius: 14rpx;
  color: #fff;
}
.weigh__total-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.78);
  letter-spacing: 1rpx;
}
.weigh__total-row {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  margin-top: 8rpx;
}
.weigh__total-sym {
  font-size: 30rpx;
  font-weight: 700;
}
.weigh__total-num {
  font-size: 60rpx;
  font-weight: 800;
  font-feature-settings: 'tnum';
  letter-spacing: -1rpx;
  line-height: 1;
}
.weigh__total-est {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.78);
}

/* panel */
.weigh__panel {
  margin-top: 18rpx;
  padding: 22rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
}
.weigh__panel-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 14rpx;
}
.weigh__panel-bar {
  width: 6rpx;
  height: 24rpx;
  background: #b7791f;
  border-radius: 2rpx;
}
.weigh__panel-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
}

.weigh__row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f1f3;
}
.weigh__row:last-child {
  border-bottom: none;
}
.weigh__row-l {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}
.weigh__row-name {
  font-size: 26rpx;
  font-weight: 700;
  color: #172033;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.weigh__row-meta {
  font-size: 20rpx;
  color: #8a94a6;
}
.weigh__row-recorded {
  font-size: 20rpx;
  color: #11865c;
  font-weight: 600;
}
.weigh__row-r {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.weigh__row-inputbox {
  display: flex;
  align-items: center;
  width: 140rpx;
  height: 64rpx;
  padding: 0 12rpx;
  background: #f7f8fa;
  border: 1rpx solid #e6e9ee;
  border-radius: 8rpx;
}
.weigh__row-input {
  flex: 1;
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
  font-feature-settings: 'tnum';
}
.weigh__row-unit {
  font-size: 20rpx;
  color: #8a94a6;
}
.weigh__row-btn {
  padding: 14rpx 16rpx;
  background: #b7791f;
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
  border-radius: 8rpx;
}
.weigh__row-btn--done {
  background: #11865c;
}
.weigh__row--fixed {
  align-items: center;
}
.weigh__row-fixed-sub {
  font-size: 28rpx;
  font-weight: 700;
  color: #c0392b;
  font-feature-settings: 'tnum';
}

.weigh__batch {
  margin-top: 12rpx;
  padding: 16rpx;
  background: #fff7e0;
  border: 1rpx dashed #b7791f;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  color: #b7791f;
  font-size: 24rpx;
  font-weight: 700;
}

/* 底部 */
.weigh__foot {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
  background: #fff;
  border-top: 1rpx solid #e6e9ee;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  display: flex;
  gap: 12rpx;
}
.weigh__btn {
  flex: 1;
  padding: 22rpx 0;
  border-radius: 10rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 700;
}
.weigh__btn--ghost {
  background: #fff;
  color: #5a6275;
  border: 1rpx solid #d8dde4;
}
.weigh__btn--primary {
  background: #c0392b;
  color: #fff;
}
.weigh__btn--disabled {
  background: #dde2ea;
  color: #b6bfcd;
}
</style>
