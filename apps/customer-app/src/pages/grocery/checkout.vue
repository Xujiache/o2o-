<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed, onMounted, ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import {
  prepayGrocery,
  previewGroceryOrder,
  submitGroceryOrder,
  type PreviewGroceryOrderVo,
} from '@/api/grocery-orders';
import { listPickupSlots, type PickupPoint, type PickupSlot } from '@/api/pickup-points';
import { useGroceryCartStore } from '@/stores/grocery-cart';
import { formatYuan } from '@/utils/format-price';

const cart = useGroceryCartStore();

const selectedPoint = ref<PickupPoint | null>(null);
const selectedDate = ref<string>('');
const slots = ref<PickupSlot[]>([]);
const selectedSlot = ref<PickupSlot | null>(null);
const remark = ref('');
const previewVo = ref<PreviewGroceryOrderVo | null>(null);
const previewing = ref(false);
const submitting = ref(false);

const PICK_KEY = 'o2o:customer:grocery-pick-result';
const MIN_AHEAD_SEC = 30 * 60;

const dateChoices = computed(() => {
  const result: Array<{ value: string; label: string }> = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    result.push({
      value: `${y}-${m}-${day}`,
      label: i === 0 ? '今天' : i === 1 ? '明天' : `${m}-${day}`,
    });
  }
  return result;
});

const validSlots = computed(() => {
  if (!selectedDate.value) return [];
  const earliest = Math.floor((Date.now() + MIN_AHEAD_SEC * 1000) / 60000);
  const today = new Date().toISOString().slice(0, 10);
  const earliestMinuteOfDay =
    selectedDate.value === today ? new Date().getMinutes() + new Date().getHours() * 60 + 30 : 0;
  return slots.value.filter((s) => {
    if (s.remain <= 0) return false;
    return s.startMinute >= earliestMinuteOfDay;
  });
});

const cartLines = computed(() => cart.lines);
const totalEstimateCents = computed(() => cart.estimatedAmountCents);

function fmtSlotTime(s: PickupSlot): string {
  const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return `${fmt(s.startMinute)} - ${fmt(s.endMinute)}`;
}

function loadPickFromStorage(): void {
  try {
    const raw = uni.getStorageSync(PICK_KEY);
    if (raw) {
      selectedPoint.value = JSON.parse(raw as string) as PickupPoint;
      uni.removeStorageSync(PICK_KEY);
      previewVo.value = null;
      selectedSlot.value = null;
      slots.value = [];
      selectedDate.value = dateChoices.value[0]?.value ?? '';
      void loadSlots();
    }
  } catch {
    /* ignore */
  }
}

async function loadSlots(): Promise<void> {
  if (!selectedPoint.value || !selectedDate.value) return;
  const r = await listPickupSlots(selectedPoint.value.pickupPointId, selectedDate.value);
  if (r.code === '0' && r.data) {
    slots.value = r.data;
    if (selectedSlot.value && !r.data.find((x) => x.slotId === selectedSlot.value?.slotId)) {
      selectedSlot.value = null;
      previewVo.value = null;
    }
  }
}

function selectDate(d: string): void {
  selectedDate.value = d;
  selectedSlot.value = null;
  previewVo.value = null;
  void loadSlots();
}

function selectSlot(s: PickupSlot): void {
  selectedSlot.value = s;
  void runPreview();
}

function goSelectPoint(): void {
  uni.navigateTo({ url: '/pages/grocery/pickup-point/list?from=checkout' });
}

async function runPreview(): Promise<void> {
  if (!selectedPoint.value || !selectedSlot.value || cartLines.value.length === 0) return;
  if (previewing.value) return;
  previewing.value = true;
  try {
    const r = await previewGroceryOrder({
      items: cartLines.value.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      pickupPointId: selectedPoint.value.pickupPointId,
      pickupSlotId: selectedSlot.value.slotId,
    });
    if (r.code === '0' && r.data) {
      previewVo.value = r.data;
    } else {
      previewVo.value = null;
    }
  } finally {
    previewing.value = false;
  }
}

async function onSubmit(): Promise<void> {
  if (!previewVo.value || submitting.value) return;
  submitting.value = true;
  try {
    const r = await submitGroceryOrder({ previewId: previewVo.value.previewId, remark: remark.value || undefined });
    if (r.code !== '0' || !r.data) {
      uni.showToast({ title: r.message ?? '下单失败', icon: 'none' });
      return;
    }
    const { groceryOrderId } = r.data;
    const pay = await prepayGrocery(groceryOrderId);
    if (pay.code !== '0' || !pay.data) {
      uni.showToast({ title: pay.message ?? '支付下单失败', icon: 'none' });
      uni.redirectTo({ url: `/pages/grocery/order/detail?orderId=${groceryOrderId}` });
      return;
    }
    cart.clear();
    uni.showToast({ title: '已生成订单', icon: 'success' });
    setTimeout(() => {
      uni.redirectTo({ url: `/pages/grocery/order/detail?orderId=${groceryOrderId}` });
    }, 800);
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  selectedDate.value = dateChoices.value[0]?.value ?? '';
});
onShow(() => {
  loadPickFromStorage();
});
</script>

<template>
  <view class="page">
    <view class="card pick-card" @tap="goSelectPoint">
      <view class="pick-card__icon">
        <SvgIcon name="location-pin" :size="32" color="#11998e" />
      </view>
      <view v-if="!selectedPoint" class="pick-card__main">
        <text class="pick-card__title">请选择自提点</text>
        <text class="pick-card__hint">点击选择最近的自提点</text>
      </view>
      <view v-else class="pick-card__main">
        <text class="pick-card__title">{{ selectedPoint.name }}</text>
        <text class="pick-card__hint">
          {{ selectedPoint.province }}{{ selectedPoint.city }}{{ selectedPoint.district }} {{ selectedPoint.address }}
        </text>
      </view>
      <SvgIcon name="chevron-right" :size="28" color="#b6bfcd" />
    </view>

    <view v-if="selectedPoint" class="card">
      <text class="card__title">选择自提日期</text>
      <scroll-view class="date-row" scroll-x>
        <view
          v-for="d in dateChoices"
          :key="d.value"
          class="date-chip"
          :class="{ 'date-chip--active': selectedDate === d.value }"
          @tap="selectDate(d.value)"
        >
          {{ d.label }}
        </view>
      </scroll-view>

      <text class="card__title card__title--gap">选择自提时段</text>
      <view v-if="validSlots.length === 0" class="empty-slot">该日暂无可选时段(需提前 30 分钟)</view>
      <view v-else class="slot-grid">
        <view
          v-for="s in validSlots"
          :key="s.slotId"
          class="slot-chip"
          :class="{ 'slot-chip--active': selectedSlot?.slotId === s.slotId }"
          @tap="selectSlot(s)"
        >
          <text class="slot-chip__time">{{ fmtSlotTime(s) }}</text>
          <text class="slot-chip__remain">剩 {{ s.remain }} 单</text>
        </view>
      </view>
    </view>

    <view class="card">
      <text class="card__title">商品清单 ({{ cartLines.length }})</text>
      <view v-if="cartLines.length === 0" class="empty-slot">购物车为空</view>
      <view v-for="l in cartLines" :key="l.productId" class="item-row">
        <text class="item-row__name">{{ l.name }}</text>
        <text class="item-row__qty">{{ l.pricingMode === 'weighed' ? `${l.quantity} g` : `× ${l.quantity}` }}</text>
      </view>
    </view>

    <view class="card">
      <text class="card__title">订单备注</text>
      <textarea
        v-model="remark"
        class="remark"
        placeholder="对自提员说点什么(选填,最多 512 字)"
        maxlength="512"
        auto-height
      />
    </view>

    <view v-if="previewVo" class="card">
      <text class="card__title">费用明细</text>
      <view class="row"
        ><text>预估商品金额</text><text>¥{{ formatYuan(previewVo.estimatedGoodsAmount) }}</text></view
      >
      <view class="row"
        ><text>优惠抵扣</text><text>-¥{{ formatYuan(previewVo.discountAmount) }}</text></view
      >
      <view class="row row--total"
        ><text>预估应付</text><text>¥{{ formatYuan(previewVo.estimatedPayableAmount) }}</text></view
      >
      <text v-if="previewVo.hasWeighedItem" class="weighed-hint">含称重商品,实际称重后多退少补</text>
    </view>

    <view class="action-bar">
      <view class="action-bar__total">
        <text class="action-bar__label">预估应付</text>
        <text class="action-bar__value"
          >¥{{ formatYuan(previewVo?.estimatedPayableAmount ?? totalEstimateCents) }}</text
        >
      </view>
      <button
        class="action-bar__btn"
        :disabled="!previewVo || submitting || cartLines.length === 0"
        :loading="submitting"
        @tap="onSubmit"
      >
        {{ submitting ? '提交中...' : '提交订单' }}
      </button>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 18rpx 24rpx 200rpx;
  box-sizing: border-box;
  background: #fafbfc;
}
.card {
  padding: 24rpx 26rpx;
  margin-bottom: 16rpx;
  background: #fff;
  border-radius: 22rpx;
  box-shadow: 0 10rpx 24rpx rgba(31, 41, 55, 0.05);
}
.card__title {
  display: block;
  font-size: 28rpx;
  font-weight: 800;
  color: #172033;
  margin-bottom: 16rpx;
}
.card__title--gap {
  margin-top: 24rpx;
}
.pick-card {
  display: flex;
  gap: 16rpx;
  align-items: center;
}
.pick-card__icon {
  width: 76rpx;
  height: 76rpx;
  border-radius: 20rpx;
  background: rgba(17, 153, 142, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}
.pick-card__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}
.pick-card__title {
  font-size: 28rpx;
  font-weight: 800;
  color: #172033;
}
.pick-card__hint {
  font-size: 22rpx;
  color: #8a94a6;
}
.date-row {
  white-space: nowrap;
}
.date-chip {
  display: inline-block;
  padding: 10rpx 28rpx;
  margin-right: 12rpx;
  font-size: 24rpx;
  color: #5a6275;
  background: #f5f6f8;
  border-radius: 999rpx;
}
.date-chip--active {
  background: #11998e;
  color: #fff;
  font-weight: 700;
}
.empty-slot {
  padding: 30rpx 0;
  text-align: center;
  color: #8a94a6;
  font-size: 24rpx;
}
.slot-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12rpx;
}
.slot-chip {
  padding: 16rpx 12rpx;
  border-radius: 18rpx;
  background: #f5f6f8;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}
.slot-chip--active {
  background: #11998e;
  color: #fff;
}
.slot-chip__time {
  font-size: 24rpx;
  font-weight: 700;
  color: inherit;
}
.slot-chip__remain {
  font-size: 20rpx;
  color: inherit;
  opacity: 0.84;
}
.item-row {
  display: flex;
  justify-content: space-between;
  padding: 10rpx 0;
  font-size: 26rpx;
}
.item-row__name {
  color: #172033;
  flex: 1;
  margin-right: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-row__qty {
  color: #5a6275;
}
.remark {
  width: 100%;
  min-height: 100rpx;
  padding: 14rpx 16rpx;
  background: #f5f6f8;
  border-radius: 16rpx;
  font-size: 26rpx;
  box-sizing: border-box;
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
.weighed-hint {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #ff6b35;
}
.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 18rpx 24rpx calc(env(safe-area-inset-bottom, 0rpx) + 18rpx);
  display: flex;
  align-items: center;
  gap: 18rpx;
  background: #fff;
  box-shadow: 0 -8rpx 24rpx rgba(31, 41, 55, 0.08);
}
.action-bar__total {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}
.action-bar__label {
  font-size: 22rpx;
  color: #8a94a6;
}
.action-bar__value {
  font-size: 36rpx;
  font-weight: 800;
  color: #ff6b35;
}
.action-bar__btn {
  height: 82rpx;
  padding: 0 56rpx;
  border-radius: 999rpx;
  background: #11998e;
  color: #fff;
  font-size: 28rpx;
  font-weight: 800;
}
</style>
