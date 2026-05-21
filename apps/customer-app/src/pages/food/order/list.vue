<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed, onMounted, ref } from 'vue';

import FloatTabBar from '@/components/common/FloatTabBar.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { type FoodOrderStatus, listOrders, type OrderListItem } from '@/api/food-orders';
import { type ListStatusTab as ErrandTab } from '@/api/errand-orders';
import { useErrandOrderStore } from '@/stores/errand-order';
import { statusLabel as errandStatusLabel, typeLabel as errandTypeLabel, urgentLabel } from '@/utils/errand-status';
import { formatYuan } from '@/utils/format-price';
import NavBar from '@/components/common/NavBar.vue';

type Mode = 'food' | 'errand';
const MODES: Array<{ key: Mode; label: string }> = [
  { key: 'food', label: '外卖' },
  { key: 'errand', label: '跑腿' },
];
const mode = ref<Mode>('food');

// ===== 外卖订单 =====
type FoodTabKey = 'all' | 'WAIT_PAY' | 'progress' | 'COMPLETED';
const foodTab = ref<FoodTabKey>('all');
const foodList = ref<OrderListItem[]>([]);
const foodLoading = ref(false);

const FOOD_TABS: Array<{ key: FoodTabKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'WAIT_PAY', label: '待支付' },
  { key: 'progress', label: '进行中' },
  { key: 'COMPLETED', label: '已完成' },
];

const FOOD_STATUS_LABEL: Record<string, string> = {
  WAIT_PAY: '待支付',
  PAID_WAIT_MERCHANT: '等商家接单',
  MERCHANT_ACCEPTED: '商家已接单',
  PREPARING: '备餐中',
  READY_FOR_PICKUP: '待取餐',
  RIDER_ASSIGNED: '已派骑手',
  PICKED_UP: '已取餐',
  DELIVERING: '配送中',
  DELIVERED: '已送达',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  REFUNDING: '退款中',
  REFUNDED: '已退款',
  AFTER_SALE: '售后中',
};

const FOOD_PROGRESS_SET = new Set<string>([
  'PAID_WAIT_MERCHANT',
  'MERCHANT_ACCEPTED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'RIDER_ASSIGNED',
  'PICKED_UP',
  'DELIVERING',
]);

async function loadFood(): Promise<void> {
  foodLoading.value = true;
  try {
    const status =
      foodTab.value === 'all' || foodTab.value === 'progress' ? undefined : (foodTab.value as FoodOrderStatus);
    const r = await listOrders({ status, pageNo: 1, pageSize: 20 });
    if (r.code === '0' && r.data) {
      let arr = r.data.list;
      if (foodTab.value === 'progress') {
        arr = arr.filter((o) => FOOD_PROGRESS_SET.has(o.status));
      }
      foodList.value = arr;
    }
  } finally {
    foodLoading.value = false;
  }
}

function foodStatusVariant(status: string): string {
  if (status === 'COMPLETED' || status === 'DELIVERED') return 'list__status--ok';
  if (status === 'CANCELLED' || status === 'REFUNDED') return 'list__status--mute';
  if (status === 'WAIT_PAY') return 'list__status--warn';
  return 'list__status--active-food';
}

function gotoFoodDetail(orderId: string): void {
  uni.navigateTo({ url: '/pages/food/order/detail?orderId=' + orderId });
}

// ===== 跑腿订单 =====
const errandStore = useErrandOrderStore();
const errandTab = ref<ErrandTab>('ALL');
const errandLoading = ref(false);
const errandList = computed(() => errandStore.list);

const ERRAND_TABS: Array<{ key: ErrandTab; label: string }> = [
  { key: 'ALL', label: '全部' },
  { key: 'WAIT_PAY', label: '待支付' },
  { key: 'IN_PROGRESS', label: '进行中' },
  { key: 'COMPLETED', label: '已完成' },
  { key: 'CANCELLED', label: '已取消' },
];

async function loadErrand(): Promise<void> {
  errandLoading.value = true;
  try {
    await errandStore.refresh(errandTab.value, 1, 10);
  } finally {
    errandLoading.value = false;
  }
}

function errandStatusVariant(status: string): string {
  if (status === 'COMPLETED') return 'list__status--ok';
  if (status === 'CANCELLED') return 'list__status--mute';
  if (status === 'WAIT_PAY') return 'list__status--warn';
  return 'list__status--active-errand';
}

function gotoErrandDetail(orderId: string): void {
  uni.navigateTo({ url: `/pages/errand/order/detail?orderId=${orderId}` });
}

// ===== Mode 切换 =====
function setMode(m: Mode): void {
  if (mode.value === m) return;
  mode.value = m;
  if (m === 'errand' && errandList.value.length === 0) {
    void loadErrand();
  } else if (m === 'food' && foodList.value.length === 0) {
    void loadFood();
  }
}

function switchFoodTab(t: FoodTabKey): void {
  foodTab.value = t;
  void loadFood();
}

function switchErrandTab(t: ErrandTab): void {
  errandTab.value = t;
  void loadErrand();
}

onMounted(() => {
  // 检查外部跳转 deeplink:首页跑腿 entry 写入了 order-list-default-mode='errand'
  const stored = uni.getStorageSync('order-list-default-mode') as string;
  if (stored === 'errand') {
    mode.value = 'errand';
    uni.removeStorageSync('order-list-default-mode');
    void loadErrand();
  } else {
    void loadFood();
  }
});

onShow(() => {
  uni.hideTabBar({ animation: false });
  // 每次回到该页都刷新当前 mode 的列表
  if (mode.value === 'food') {
    void loadFood();
  } else {
    void loadErrand();
  }
});
</script>

<template>
  <view class="order-page" :class="`order-page--${mode}`">
    <NavBar title="我的订单" />
    <!-- 大分类 tabs:外卖 / 跑腿(京东风格) -->
    <view class="segment">
      <view
        v-for="m in MODES"
        :key="m.key"
        class="segment__item"
        :class="{ 'segment__item--active': mode === m.key }"
        @tap="setMode(m.key)"
      >
        <text class="segment__label">{{ m.label }}</text>
        <view v-if="mode === m.key" class="segment__indicator" />
      </view>
    </view>

    <!-- ===== 外卖 mode ===== -->
    <template v-if="mode === 'food'">
      <view class="subtabs">
        <view
          v-for="t in FOOD_TABS"
          :key="t.key"
          class="subtab"
          :class="{ 'subtab--active subtab--active-food': foodTab === t.key }"
          @tap="switchFoodTab(t.key)"
        >
          <text class="subtab__label">{{ t.label }}</text>
          <view v-if="foodTab === t.key && t.key !== 'all'" class="subtab__x" @tap.stop="switchFoodTab('all')">
            <SvgIcon name="x" :size="24" />
          </view>
        </view>
      </view>

      <view v-if="foodLoading" class="empty">加载中…</view>
      <view v-else-if="foodList.length === 0" class="empty">
        <SvgIcon name="store" :size="120" color="#c5c9d2" />
        <text class="empty__text">暂无外卖订单</text>
      </view>

      <view v-else class="cards">
        <view v-for="o in foodList" :key="o.orderId" class="card" @tap="gotoFoodDetail(o.orderId)">
          <view class="card__head">
            <view class="card__head-l">
              <text class="card__tag card__tag--food">外卖</text>
              <text class="card__order-no">{{ o.orderNo }}</text>
            </view>
            <text class="card__status" :class="foodStatusVariant(o.status)">
              {{ FOOD_STATUS_LABEL[o.status] ?? o.status }}
            </text>
          </view>
          <view class="card__body">
            <SvgIcon name="utensils" :size="20" color="var(--brand-primary)" />
            <text class="card__brief">{{ o.itemsBrief }}</text>
          </view>
          <view class="card__foot">
            <text class="card__foot-l">合计</text>
            <text class="card__amount">¥{{ formatYuan(o.payableAmount) }}</text>
          </view>
        </view>
      </view>
    </template>

    <!-- ===== 跑腿 mode ===== -->
    <template v-else>
      <view class="subtabs">
        <view
          v-for="t in ERRAND_TABS"
          :key="t.key"
          class="subtab"
          :class="{ 'subtab--active subtab--active-errand': errandTab === t.key }"
          @tap="switchErrandTab(t.key)"
        >
          <text class="subtab__label">{{ t.label }}</text>
          <view v-if="errandTab === t.key && t.key !== 'ALL'" class="subtab__x" @tap.stop="switchErrandTab('ALL')">
            <SvgIcon name="x" :size="24" />
          </view>
        </view>
      </view>

      <view v-if="errandLoading" class="empty">加载中…</view>
      <view v-else-if="errandList.length === 0" class="empty">
        <SvgIcon name="package" :size="120" color="#c5c9d2" />
        <text class="empty__text">暂无跑腿订单</text>
      </view>

      <view v-else class="cards">
        <view v-for="o in errandList" :key="o.orderId" class="card" @tap="gotoErrandDetail(o.orderId)">
          <view class="card__head">
            <view class="card__head-l">
              <text class="card__tag card__tag--errand">{{ errandTypeLabel(o.typeCode) }}</text>
              <text class="card__order-no">{{ o.orderNo }}</text>
            </view>
            <text class="card__status" :class="errandStatusVariant(o.status)">
              {{ errandStatusLabel(o.status) }}
            </text>
          </view>
          <view class="card__body">
            <SvgIcon name="location-pin" :size="20" color="var(--brand-primary)" />
            <text class="card__brief">{{ o.deliveryAddress }}</text>
          </view>
          <view class="card__foot">
            <view class="card__foot-l-icon">
              <SvgIcon name="rocket" :size="18" color="#fa709a" />
              <text class="card__foot-l">{{ urgentLabel(o.urgentLevel) }}</text>
            </view>
            <text class="card__amount">¥{{ formatYuan(o.payableAmount) }}</text>
          </view>
        </view>
      </view>
    </template>

    <FloatTabBar active="orders" />
  </view>
</template>

<style scoped>
.order-page {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 0 24rpx 200rpx;
  transition: background 280ms ease;
}
.order-page--food {
  background: #fff;
}
.order-page--errand {
  background: #fff;
}

/* 大分类 tabs(京东风格,大字 + 下划线) */
.segment {
  display: flex;
  gap: 48rpx;
  padding: 20rpx 12rpx 12rpx;
  margin-bottom: 16rpx;
}
.segment__item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 16rpx;
  opacity: 0.55;
  transition: opacity 200ms ease;
}
.segment__item--active {
  opacity: 1;
}
.segment__label {
  font-size: 34rpx;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: 1rpx;
}
.segment__indicator {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 52rpx;
  height: 8rpx;
  border-radius: 999rpx;
}
.order-page--food .segment__indicator {
  background: var(--brand-gradient);
  box-shadow: 0 4rpx 12rpx rgba(46, 156, 93, 0.36);
}
.order-page--errand .segment__indicator {
  background: var(--brand-gradient);
  box-shadow: 0 4rpx 12rpx rgba(46, 156, 93, 0.36);
}

/* 子 tabs */
.subtabs {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  gap: 12rpx;
  padding: 6rpx 4rpx 20rpx;
}
.subtabs::-webkit-scrollbar {
  display: none;
}
.subtab {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  background: #fff;
  font-size: 26rpx;
  color: var(--text-secondary);
  box-shadow: 0 4rpx 12rpx rgba(31, 41, 55, 0.04);
}
.subtab__label {
  font-size: 26rpx;
  line-height: 1;
}
.subtab__x {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.86);
  line-height: 1;
  padding: 2rpx 2rpx 0 4rpx;
}
.subtab--active {
  color: #fff;
  font-weight: 700;
}
.subtab--active .subtab__label {
  font-weight: 700;
}
.subtab--active-food {
  background: var(--brand-gradient);
  box-shadow: 0 8rpx 20rpx rgba(46, 156, 93, 0.3);
}
.subtab--active-errand {
  background: var(--brand-gradient);
  box-shadow: 0 8rpx 20rpx rgba(46, 156, 93, 0.3);
}

/* Empty */
.empty {
  padding: 140rpx 40rpx;
  text-align: center;
  color: var(--text-muted);
  font-size: 26rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.empty__text {
  font-size: 28rpx;
}

/* 卡片 */
.cards {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}
.card {
  padding: 26rpx 28rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 12rpx 32rpx rgba(31, 41, 55, 0.06);
}
.card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14rpx;
}
.card__head-l {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
  min-width: 0;
}
.card__tag {
  padding: 4rpx 14rpx;
  font-size: 22rpx;
  font-weight: 700;
  border-radius: 8rpx;
}
.card__tag--food {
  background: linear-gradient(135deg, #fff1e6, #ffe6cc);
  color: var(--brand-primary);
}
.card__tag--errand {
  background: linear-gradient(135deg, #ebecff, #e0f7fa);
  color: var(--brand-primary);
}
.card__order-no {
  font-size: 22rpx;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card__status {
  font-size: 24rpx;
  font-weight: 700;
  flex-shrink: 0;
}
.list__status--ok,
.card__status.list__status--ok {
  color: #11998e;
}
.list__status--mute,
.card__status.list__status--mute {
  color: var(--text-muted);
}
.list__status--warn,
.card__status.list__status--warn {
  color: #ff8c42;
}
.list__status--active-food {
  color: var(--brand-primary);
}
.list__status--active-errand {
  color: var(--brand-primary);
}

.card__body {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  padding: 14rpx 0;
  border-top: 1rpx solid rgba(31, 41, 55, 0.05);
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.05);
}
.card__brief {
  flex: 1;
  font-size: 26rpx;
  color: var(--text-primary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14rpx;
}
.card__foot-l-icon {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.card__foot-l {
  font-size: 22rpx;
  color: var(--text-muted);
}
.card__amount {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--price-color);
}
</style>
