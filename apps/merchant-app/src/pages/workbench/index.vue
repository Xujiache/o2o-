<script setup lang="ts">
/**
 * 商家工作台 — 进店第一眼,聚焦"今天要干什么"
 * 内容(无重复):
 *   Hero       店铺 + 营业开关
 *   经营概览   今日营收(大字)+ 同比 + 订单/客单价/评分/商品数
 *   待办事项   仅有项时显示(待接单 / 售后 / 评价 / 库存)
 *   最新评价   3 条预览 + 查看全部
 *   快捷入口   不在 tabBar/待办的次要操作(促销/分类/导出/配送)
 *
 * 重复内容已剔除:tabBar 已有的"订单/商品/统计/我的"不再重复出现,
 *               "我的"页里的店铺设置/结算提现等长尾入口不再重复出现。
 */
import { onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';

import FloatTabBar from '@/components/common/FloatTabBar.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';

import { getStore, listProducts, listStockAlerts, setBusinessStatus, type StoreVo } from '@/api';
import { listAfterSales } from '@/api/after-sales';
import { listPendingOrders } from '@/api/merchant-orders';
import { listReviews, type ReviewListItemVo } from '@/api/reviews';
import { getStatistics, type StatisticsVo } from '@/api/statistics';

const store = ref<StoreVo | null>(null);
const switching = ref(false);

const todayStat = ref<StatisticsVo | null>(null);
const yesterdayStat = ref<StatisticsVo | null>(null);
const pendingCount = ref(0);
const afterSaleCount = ref(0);
const stockAlertCount = ref(0);
const unrepliedCount = ref(0);
const latestReviews = ref<ReviewListItemVo[]>([]);
const productCount = ref(0);

async function loadAll(): Promise<void> {
  await Promise.allSettled([
    loadStore(),
    loadStat(),
    loadPending(),
    loadAfterSales(),
    loadStockAlerts(),
    loadReviews(),
    loadProductCount(),
  ]);
}

async function loadStore(): Promise<void> {
  const r = await getStore();
  if (r.code === '0' && r.data) store.value = r.data;
}
async function loadStat(): Promise<void> {
  const [t, y] = await Promise.all([getStatistics('TODAY'), getStatistics('YESTERDAY')]);
  if (t.code === '0' && t.data) todayStat.value = t.data;
  if (y.code === '0' && y.data) yesterdayStat.value = y.data;
}
async function loadPending(): Promise<void> {
  const r = await listPendingOrders({ pageNo: 1, pageSize: 1 });
  if (r.code === '0' && r.data) pendingCount.value = r.data.total;
}
async function loadAfterSales(): Promise<void> {
  const r = await listAfterSales({ status: 'PENDING_MERCHANT', pageNo: 1, pageSize: 1 });
  if (r.code === '0' && r.data) afterSaleCount.value = r.data.total;
}
async function loadStockAlerts(): Promise<void> {
  const r = await listStockAlerts();
  if (r.code === '0' && r.data) stockAlertCount.value = r.data.length;
}
async function loadReviews(): Promise<void> {
  const r = await listReviews({ pageNo: 1, pageSize: 3 });
  if (r.code === '0' && r.data) {
    latestReviews.value = r.data.list;
    unrepliedCount.value = r.data.unrepliedCount;
  }
}
async function loadProductCount(): Promise<void> {
  const r = await listProducts({ pageNo: 1, pageSize: 1 });
  if (r.code === '0' && r.data) productCount.value = r.data.total;
}

onShow(() => {
  uni.hideTabBar({ animation: false });
  void loadAll();
});

const isOnline = computed<boolean>(() => store.value?.businessStatus === 'online');
const isPausedByPlatform = computed<boolean>(() => store.value?.businessStatus === 'paused');

const todayString = computed<string>(() => {
  const d = new Date();
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 · 周${['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}`;
});

function fmtYuan(cents: string | undefined | null): string {
  if (!cents) return '0.00';
  return (Number(cents) / 100).toFixed(2);
}

const todayGross = computed(() => fmtYuan(todayStat.value?.grossCents));
const yesterdayGross = computed(() => fmtYuan(yesterdayStat.value?.grossCents));
const todayOrders = computed(() => todayStat.value?.orderCount ?? 0);

const avgOrderYuan = computed<string>(() => {
  const oc = todayStat.value?.orderCount ?? 0;
  if (oc === 0) return '0.00';
  return (Number(todayStat.value?.netCents ?? 0) / 100 / oc).toFixed(2);
});

const ratingValue = computed<number>(() => Number(todayStat.value?.storeRating ?? 0));

const grossDelta = computed<{ pct: string; up: boolean } | null>(() => {
  const t = Number(todayStat.value?.grossCents ?? 0);
  const y = Number(yesterdayStat.value?.grossCents ?? 0);
  if (y === 0 && t === 0) return null;
  if (y === 0) return { pct: '—', up: true };
  const diff = ((t - y) / y) * 100;
  return { pct: `${Math.abs(diff).toFixed(1)}%`, up: diff >= 0 };
});

const totalPending = computed(
  () => pendingCount.value + afterSaleCount.value + stockAlertCount.value + unrepliedCount.value,
);

async function toggleBusiness(): Promise<void> {
  if (!store.value || isPausedByPlatform.value || switching.value) return;
  switching.value = true;
  try {
    const target = isOnline.value ? 'offline' : 'online';
    const r = await setBusinessStatus({ businessStatus: target });
    if (r.code !== '0') {
      uni.showToast({ title: r.message ?? '切换失败', icon: 'none' });
      return;
    }
    uni.showToast({ title: target === 'online' ? '已开始营业' : '已暂停营业', icon: 'success' });
    await loadStore();
  } finally {
    switching.value = false;
  }
}

// 待办 — 仅与 tabBar 不冲突 + 状态需提醒的 4 类
interface TodoRow {
  key: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  label: string;
  desc: string;
  count: number;
  unit: string;
  url: string;
  isTab?: boolean;
}
const todos = computed<TodoRow[]>(() => {
  const rows: TodoRow[] = [];
  if (pendingCount.value > 0)
    rows.push({
      key: 'pending',
      icon: 'bell',
      iconColor: '#c0392b',
      iconBg: 'rgba(192, 57, 43, 0.1)',
      label: '待接单',
      desc: '需在限定时间内接单',
      count: pendingCount.value,
      unit: '笔',
      url: '/pages/orders/pending',
      isTab: true,
    });
  if (afterSaleCount.value > 0)
    rows.push({
      key: 'after-sales',
      icon: 'life-buoy',
      iconColor: '#ed6c02',
      iconBg: 'rgba(237, 108, 2, 0.1)',
      label: '售后待审',
      desc: '待商家审核退款/退货',
      count: afterSaleCount.value,
      unit: '笔',
      url: '/pages/after-sales/list',
    });
  if (unrepliedCount.value > 0)
    rows.push({
      key: 'reviews',
      icon: 'star',
      iconColor: '#f7971e',
      iconBg: 'rgba(247, 151, 30, 0.1)',
      label: '评价待回复',
      desc: '及时回复维护店铺评分',
      count: unrepliedCount.value,
      unit: '条',
      url: '/pages/reviews/list',
    });
  if (stockAlertCount.value > 0)
    rows.push({
      key: 'stock',
      icon: 'alert-triangle',
      iconColor: '#b7791f',
      iconBg: 'rgba(183, 121, 31, 0.1)',
      label: '库存预警',
      desc: '商品库存低于阈值',
      count: stockAlertCount.value,
      unit: '个',
      url: '/pages/stock/alerts',
    });
  return rows;
});

// 快捷入口 — 仅放 tabBar 和待办都未覆盖的次要操作
interface QuickRow {
  key: string;
  icon: string;
  label: string;
  url: string;
}
const QUICKS: QuickRow[] = [
  { key: 'promotions', icon: 'gift', label: '促销活动', url: '/pages/promotions/list' },
  { key: 'categories', icon: 'layout-grid', label: '商品分类', url: '/pages/products/categories' },
  { key: 'exports', icon: 'file-edit', label: '数据导出', url: '/pages/exports/index' },
  { key: 'delivery', icon: 'truck', label: '配送范围', url: '/pages/store/delivery-area' },
];

function go(url: string, isTab = false): void {
  if (isTab) uni.switchTab({ url });
  else uni.navigateTo({ url });
}

function gotoTodo(t: TodoRow): void {
  go(t.url, t.isTab);
}

function gotoOnboarding(): void {
  uni.navigateTo({ url: '/pages/onboarding/apply' });
}

function gotoReviews(): void {
  uni.navigateTo({ url: '/pages/reviews/list' });
}

function gotoStat(): void {
  uni.switchTab({ url: '/pages/statistics/index' });
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
</script>

<template>
  <view class="wb">
    <!-- Hero -->
    <view class="wb__hero">
      <view class="wb__hero-row">
        <view class="wb__hero-main">
          <text class="wb__hero-date">{{ todayString }}</text>
          <text v-if="store" class="wb__hero-store">{{ store.name }}</text>
          <text v-else class="wb__hero-store">暂未入驻</text>
        </view>
        <view
          v-if="store"
          class="wb__switch"
          :class="{
            'wb__switch--on': isOnline,
            'wb__switch--off': !isOnline && !isPausedByPlatform,
            'wb__switch--paused': isPausedByPlatform,
          }"
          @tap="toggleBusiness"
        >
          <text v-if="switching" class="wb__switch-text">切换中…</text>
          <template v-else>
            <view class="wb__switch-dot" />
            <text class="wb__switch-text">
              {{ isPausedByPlatform ? '平台暂停' : isOnline ? '营业中' : '已休业' }}
            </text>
          </template>
        </view>
        <view v-else class="wb__hero-cta" @tap="gotoOnboarding">去入驻 ›</view>
      </view>
      <text v-if="isPausedByPlatform" class="wb__hero-warn">店铺已被平台暂停,请联系运营</text>
    </view>

    <!-- 经营概览(合并今日数据 + 同比 + 关键指标) -->
    <view class="wb__overview">
      <view class="wb__overview-head" @tap="gotoStat">
        <text class="wb__overview-label">今日营业额</text>
        <text class="wb__overview-link">查看完整 ›</text>
      </view>
      <view class="wb__overview-row">
        <text class="wb__overview-symbol">¥</text>
        <text class="wb__overview-num">{{ todayGross }}</text>
        <view
          v-if="grossDelta"
          class="wb__overview-delta"
          :class="grossDelta.up ? 'wb__overview-delta--up' : 'wb__overview-delta--down'"
        >
          <text>{{ grossDelta.up ? '↑' : '↓' }} {{ grossDelta.pct }}</text>
        </view>
      </view>
      <text class="wb__overview-sub">较昨日 ¥{{ yesterdayGross }}</text>

      <view class="wb__overview-grid">
        <view class="wb__overview-item">
          <text class="wb__overview-item-val">{{ todayOrders }}</text>
          <text class="wb__overview-item-label">订单数</text>
        </view>
        <view class="wb__overview-item">
          <text class="wb__overview-item-val">¥{{ avgOrderYuan }}</text>
          <text class="wb__overview-item-label">客单价</text>
        </view>
        <view class="wb__overview-item">
          <text class="wb__overview-item-val">{{ ratingValue.toFixed(2) }}</text>
          <text class="wb__overview-item-label">店铺评分</text>
        </view>
        <view class="wb__overview-item">
          <text class="wb__overview-item-val">{{ productCount }}</text>
          <text class="wb__overview-item-label">商品数</text>
        </view>
      </view>
    </view>

    <!-- 待办事项 — 仅有时显示 -->
    <view v-if="todos.length > 0" class="wb__section">
      <view class="wb__section-head">
        <view class="wb__section-bar" />
        <text class="wb__section-title">待办事项</text>
        <text class="wb__section-tip">{{ totalPending }} 项需处理</text>
      </view>
      <view class="wb__todo">
        <view v-for="t in todos" :key="t.key" class="wb__todo-row" @tap="gotoTodo(t)">
          <view class="wb__todo-icon" :style="`background: ${t.iconBg};`">
            <SvgIcon :name="t.icon" :size="24" :color="t.iconColor" />
          </view>
          <view class="wb__todo-main">
            <text class="wb__todo-label">{{ t.label }}</text>
            <text class="wb__todo-desc">{{ t.desc }}</text>
          </view>
          <text class="wb__todo-count">{{ t.count }} {{ t.unit }}</text>
          <text class="wb__todo-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 全部完成 — 待办为空时显示 -->
    <view v-else class="wb__allgood">
      <view class="wb__allgood-icon">
        <SvgIcon name="check-circle" :size="40" color="#11865c" />
      </view>
      <view class="wb__allgood-main">
        <text class="wb__allgood-title">今日运营良好</text>
        <text class="wb__allgood-sub">所有待办已处理完成,继续保持</text>
      </view>
    </view>

    <!-- 最新评价 -->
    <view v-if="latestReviews.length > 0" class="wb__section">
      <view class="wb__section-head">
        <view class="wb__section-bar" />
        <text class="wb__section-title">最新评价</text>
        <text class="wb__section-tip" @tap="gotoReviews">全部 ›</text>
      </view>
      <view class="wb__rvs">
        <view v-for="r in latestReviews" :key="r.orderReviewId" class="wb__rv" @tap="gotoReviews">
          <view class="wb__rv-head">
            <view class="wb__rv-stars">
              <SvgIcon v-for="i in 5" :key="i" name="star" :size="16" :color="r.rating >= i ? '#f7971e' : '#dde2ea'" />
            </view>
            <text class="wb__rv-user">{{ r.customerLabel }}</text>
            <text class="wb__rv-time">{{ fmtTime(r.createdAt) }}</text>
          </view>
          <text class="wb__rv-content" v-if="r.content">{{ r.content }}</text>
          <text class="wb__rv-content wb__rv-content--mute" v-else>用户未填写评价文字</text>
          <view v-if="!r.reply" class="wb__rv-tag">待回复</view>
          <view v-else class="wb__rv-tag wb__rv-tag--ok">已回复</view>
        </view>
      </view>
    </view>

    <!-- 快捷入口 — 仅 tabBar/待办未覆盖的 4 个次要操作 -->
    <view class="wb__section">
      <view class="wb__section-head">
        <view class="wb__section-bar" />
        <text class="wb__section-title">快捷入口</text>
      </view>
      <view class="wb__quicks">
        <view v-for="q in QUICKS" :key="q.key" class="wb__quick" @tap="go(q.url)">
          <view class="wb__quick-icon">
            <SvgIcon :name="q.icon" :size="26" color="#b7791f" />
          </view>
          <text class="wb__quick-label">{{ q.label }}</text>
        </view>
      </view>
    </view>

    <view class="wb__foot">
      <text class="wb__foot-text">O2O 商家工作台 · 已为您实时同步今日数据</text>
    </view>
    <FloatTabBar active="workbench" />
  </view>
</template>

<style scoped>
.wb {
  min-height: 100vh;
  padding: 0 0 200rpx;
  background: #f5f6f8;
}

/* Hero */
.wb__hero {
  padding: 40rpx 28rpx 60rpx;
  background: linear-gradient(135deg, #1f2937 0%, #b7791f 100%);
  color: #fff;
}
.wb__hero-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.wb__hero-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}
.wb__hero-date {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.72);
  letter-spacing: 1rpx;
}
.wb__hero-store {
  font-size: 44rpx;
  font-weight: 800;
  letter-spacing: -1rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wb__hero-warn {
  display: block;
  margin-top: 16rpx;
  font-size: 22rpx;
  color: rgba(255, 200, 200, 0.95);
}
.wb__hero-cta {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 24rpx;
  padding: 14rpx 24rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.wb__switch {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 14rpx 26rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.wb__switch--on {
  background: rgba(56, 239, 125, 0.92);
  color: #064f30;
  box-shadow: 0 8rpx 24rpx rgba(56, 239, 125, 0.36);
}
.wb__switch--off {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}
.wb__switch--paused {
  background: rgba(255, 77, 79, 0.92);
  color: #fff;
}
.wb__switch-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: currentColor;
}
.wb__switch-text {
  font-size: 24rpx;
  font-weight: 700;
}

/* 经营概览 */
.wb__overview {
  margin: -32rpx 24rpx 0;
  padding: 28rpx 28rpx 24rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
  box-shadow: 0 12rpx 32rpx rgba(31, 41, 55, 0.06);
  position: relative;
  z-index: 2;
}
.wb__overview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.wb__overview-label {
  font-size: 22rpx;
  color: #8a94a6;
  letter-spacing: 0.5rpx;
}
.wb__overview-link {
  font-size: 22rpx;
  color: #b7791f;
  font-weight: 600;
}
.wb__overview-row {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  margin-top: 10rpx;
}
.wb__overview-symbol {
  font-size: 30rpx;
  font-weight: 600;
  color: #172033;
}
.wb__overview-num {
  font-size: 64rpx;
  font-weight: 800;
  color: #172033;
  line-height: 1;
  letter-spacing: -1rpx;
  font-feature-settings: 'tnum';
}
.wb__overview-delta {
  margin-left: 4rpx;
  padding: 4rpx 10rpx;
  border-radius: 6rpx;
  font-size: 20rpx;
  font-weight: 700;
}
.wb__overview-delta--up {
  background: rgba(17, 134, 92, 0.1);
  color: #11865c;
}
.wb__overview-delta--down {
  background: rgba(192, 57, 43, 0.1);
  color: #c0392b;
}
.wb__overview-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8a94a6;
}
.wb__overview-grid {
  margin-top: 22rpx;
  padding-top: 22rpx;
  border-top: 1rpx solid #f0f1f3;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8rpx;
}
.wb__overview-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}
.wb__overview-item-val {
  font-size: 26rpx;
  font-weight: 800;
  color: #172033;
  line-height: 1.1;
  font-feature-settings: 'tnum';
}
.wb__overview-item-label {
  font-size: 20rpx;
  color: #8a94a6;
}

/* Section */
.wb__section {
  margin: 16rpx 24rpx 0;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
  padding: 22rpx 22rpx 18rpx;
}
.wb__section-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 14rpx;
}
.wb__section-bar {
  width: 6rpx;
  height: 24rpx;
  background: #b7791f;
  border-radius: 2rpx;
}
.wb__section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
}
.wb__section-tip {
  font-size: 22rpx;
  color: #8a94a6;
  margin-left: auto;
}

/* 待办 */
.wb__todo {
  display: flex;
  flex-direction: column;
}
.wb__todo-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f0f1f3;
}
.wb__todo-row:last-child {
  border-bottom: none;
}
.wb__todo-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.wb__todo-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}
.wb__todo-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #172033;
}
.wb__todo-desc {
  font-size: 20rpx;
  color: #8a94a6;
}
.wb__todo-count {
  font-size: 24rpx;
  font-weight: 700;
  color: #c0392b;
  flex-shrink: 0;
  font-feature-settings: 'tnum';
}
.wb__todo-arrow {
  color: #c5c9d2;
  font-size: 32rpx;
  margin-left: 4rpx;
}

/* 全部完成态 */
.wb__allgood {
  margin: 16rpx 24rpx 0;
  padding: 22rpx 24rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.wb__allgood-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;
  background: rgba(17, 134, 92, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.wb__allgood-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}
.wb__allgood-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #11865c;
}
.wb__allgood-sub {
  font-size: 20rpx;
  color: #8a94a6;
}

/* 最新评价 */
.wb__rvs {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.wb__rv {
  position: relative;
  padding: 14rpx 14rpx 14rpx 14rpx;
  background: #f7f8fa;
  border-radius: 10rpx;
}
.wb__rv-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.wb__rv-stars {
  display: flex;
  gap: 2rpx;
}
.wb__rv-user {
  font-size: 22rpx;
  color: #5a6275;
}
.wb__rv-time {
  font-size: 18rpx;
  color: #b6bfcd;
  margin-left: auto;
}
.wb__rv-content {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #172033;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.wb__rv-content--mute {
  color: #b6bfcd;
}
.wb__rv-tag {
  position: absolute;
  top: 14rpx;
  right: 14rpx;
  padding: 4rpx 10rpx;
  background: #fff7e0;
  color: #b7791f;
  font-size: 18rpx;
  font-weight: 700;
  border-radius: 4rpx;
}
.wb__rv-tag--ok {
  background: rgba(17, 134, 92, 0.1);
  color: #11865c;
}

/* 快捷入口 — 4 列 */
.wb__quicks {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
}
.wb__quick {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 0;
}
.wb__quick-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;
  background: rgba(183, 121, 31, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.wb__quick-label {
  font-size: 22rpx;
  color: #5a6275;
  font-weight: 500;
}

/* foot */
.wb__foot {
  margin: 24rpx 24rpx 0;
  padding: 16rpx 0;
  text-align: center;
}
.wb__foot-text {
  font-size: 20rpx;
  color: #b6bfcd;
}
</style>
