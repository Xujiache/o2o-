<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import {
  type AvailableCouponItem,
  type MyCouponItem,
  type UserCouponStatus,
  claimCoupon,
  listAvailableCoupons,
  listMyCoupons,
} from '@/api/coupons';
import { formatYuan } from '@/utils/format-price';
import NavBar from '@/components/common/NavBar.vue';

type Mode = 'my' | 'available';
type MyTab = 'all' | UserCouponStatus;

const mode = ref<Mode>('my');
const myTab = ref<MyTab>('all');

const myList = ref<MyCouponItem[]>([]);
const availableList = ref<AvailableCouponItem[]>([]);
const loading = ref(false);
const claiming = ref<string>('');

const MY_TABS: Array<{ key: MyTab; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'UNUSED', label: '未使用' },
  { key: 'USED', label: '已使用' },
  { key: 'EXPIRED', label: '已过期' },
];

const filteredMyList = computed(() => {
  if (myTab.value === 'all') return myList.value;
  return myList.value.filter((c) => c.status === myTab.value);
});

function bizLabel(b: string): string {
  if (b === 'FOOD') return '外卖';
  if (b === 'ERRAND') return '跑腿';
  return '通用';
}

/** 折扣文案:AMOUNT 满 X 减 Y;DISCOUNT 满 X 打 Y 折(discount 是千分位 ‰) */
function couponHead(c: { couponType: string; threshold: string; discount: string }): string {
  if (c.couponType === 'AMOUNT') {
    return `¥${formatYuan(c.discount)}`;
  }
  const permille = Number(c.discount);
  return `${(permille / 100).toFixed(1)}折`;
}
function couponRule(c: { threshold: string }): string {
  const t = Number(c.threshold);
  return t > 0 ? `满 ¥${formatYuan(c.threshold)} 可用` : '无门槛';
}
function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

async function loadMy(): Promise<void> {
  loading.value = true;
  try {
    const r = await listMyCoupons({ pageNo: 1, pageSize: 50 });
    if (r.code === '0' && r.data) myList.value = r.data.items;
  } finally {
    loading.value = false;
  }
}

async function loadAvailable(): Promise<void> {
  loading.value = true;
  try {
    const r = await listAvailableCoupons({ pageNo: 1, pageSize: 50 });
    if (r.code === '0' && r.data) availableList.value = r.data.items;
  } finally {
    loading.value = false;
  }
}

function setMode(m: Mode): void {
  if (mode.value === m) return;
  mode.value = m;
  if (m === 'my') void loadMy();
  else void loadAvailable();
}

function setMyTab(t: MyTab): void {
  myTab.value = t;
}

async function onClaim(c: AvailableCouponItem): Promise<void> {
  if (c.alreadyClaimed || claiming.value) return;
  claiming.value = c.couponRuleId;
  try {
    const r = await claimCoupon(c.couponRuleId);
    if (r.code === '0') {
      uni.showToast({ title: '领取成功', icon: 'success' });
      void loadAvailable();
    } else {
      uni.showToast({ title: r.message || '领取失败', icon: 'none' });
      if (r.code === 'INVALID_PARAM') void loadAvailable();
    }
  } catch (err) {
    uni.showToast({ title: err instanceof Error ? err.message : '网络异常', icon: 'none' });
  } finally {
    claiming.value = '';
  }
}

onMounted(() => {
  void loadMy();
});
</script>

<template>
  <view class="cp">
    <NavBar title="我的优惠券" />
    <!-- 顶部 segment -->
    <view class="cp__segment">
      <view class="cp__segment-item" :class="{ 'cp__segment-item--active': mode === 'my' }" @tap="setMode('my')">
        <text class="cp__segment-label">我的优惠券</text>
        <view v-if="mode === 'my'" class="cp__segment-indicator" />
      </view>
      <view
        class="cp__segment-item"
        :class="{ 'cp__segment-item--active': mode === 'available' }"
        @tap="setMode('available')"
      >
        <text class="cp__segment-label">领券中心</text>
        <view v-if="mode === 'available'" class="cp__segment-indicator" />
      </view>
    </view>

    <!-- ===== 我的优惠券 ===== -->
    <template v-if="mode === 'my'">
      <view class="cp__chips">
        <view
          v-for="t in MY_TABS"
          :key="t.key"
          class="cp__chip"
          :class="{ 'cp__chip--active': myTab === t.key }"
          @tap="setMyTab(t.key)"
        >
          <text class="cp__chip-label">{{ t.label }}</text>
          <view v-if="myTab === t.key && t.key !== 'all'" class="cp__chip-x" @tap.stop="setMyTab('all')">
            <SvgIcon name="x" :size="24" />
          </view>
        </view>
      </view>

      <view v-if="loading" class="cp__msg">加载中…</view>
      <view v-else-if="filteredMyList.length === 0" class="cp__msg">
        <SvgIcon name="ticket" :size="100" color="#c5c9d2" />
        <text class="cp__msg-text">这里还没有优惠券</text>
        <text class="cp__msg-hint" @tap="setMode('available')">去领券中心看看 ›</text>
      </view>

      <view v-else class="cp__list">
        <view
          v-for="c in filteredMyList"
          :key="c.userCouponId"
          class="cp__card"
          :class="{ 'cp__card--mute': c.status !== 'UNUSED' }"
        >
          <view class="cp__card-l">
            <text class="cp__card-amt">{{ couponHead(c) }}</text>
            <text class="cp__card-cond">{{ couponRule(c) }}</text>
          </view>
          <view class="cp__card-r">
            <view class="cp__card-row">
              <text class="cp__card-tag">{{ bizLabel(c.bizType) }}</text>
              <text class="cp__card-name">{{ c.couponName }}</text>
            </view>
            <text class="cp__card-period">{{ fmtDate(c.validFrom) }} - {{ fmtDate(c.validTo) }}</text>
            <view class="cp__card-status">
              <text v-if="c.status === 'UNUSED'" class="cp__card-badge cp__card-badge--ok">未使用</text>
              <text v-else-if="c.status === 'USED'" class="cp__card-badge cp__card-badge--mute">已使用</text>
              <text v-else class="cp__card-badge cp__card-badge--mute">已过期</text>
            </view>
          </view>
        </view>
      </view>
    </template>

    <!-- ===== 领券中心 ===== -->
    <template v-else>
      <view v-if="loading" class="cp__msg">加载中…</view>
      <view v-else-if="availableList.length === 0" class="cp__msg">
        <SvgIcon name="ticket" :size="100" color="#c5c9d2" />
        <text class="cp__msg-text">暂无可领取的优惠券</text>
      </view>

      <view v-else class="cp__list">
        <view v-for="c in availableList" :key="c.couponRuleId" class="cp__card">
          <view class="cp__card-l">
            <text class="cp__card-amt">{{ couponHead(c) }}</text>
            <text class="cp__card-cond">{{ couponRule(c) }}</text>
          </view>
          <view class="cp__card-r">
            <view class="cp__card-row">
              <text class="cp__card-tag">{{ bizLabel(c.bizType) }}</text>
              <text class="cp__card-name">{{ c.couponName }}</text>
            </view>
            <text class="cp__card-period">有效期至 {{ fmtDate(c.validTo) }}</text>
            <text class="cp__card-stock">剩余 {{ c.remainStock }} 张</text>
          </view>
          <view
            class="cp__claim"
            :class="{ 'cp__claim--disabled': c.alreadyClaimed || claiming === c.couponRuleId }"
            @tap="onClaim(c)"
          >
            {{ c.alreadyClaimed ? '已领取' : claiming === c.couponRuleId ? '...' : '领取' }}
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.cp {
  min-height: 100vh;
  padding: 0 24rpx 80rpx;
  background: linear-gradient(180deg, #fff7ed 0%, #f6f8fb 320rpx);
}

/* segment */
.cp__segment {
  display: flex;
  gap: 56rpx;
  padding: 24rpx 12rpx 16rpx;
}
.cp__segment-item {
  position: relative;
  padding-bottom: 14rpx;
  opacity: 0.55;
}
.cp__segment-item--active {
  opacity: 1;
}
.cp__segment-label {
  font-size: 34rpx;
  font-weight: 800;
  color: var(--text-primary);
}
.cp__segment-indicator {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 48rpx;
  height: 6rpx;
  border-radius: 999rpx;
  background: var(--brand-gradient);
  box-shadow: 0 4rpx 10rpx rgba(46, 156, 93, 0.36);
}

/* chips */
.cp__chips {
  display: flex;
  gap: 12rpx;
  padding: 4rpx 4rpx 20rpx;
  flex-wrap: nowrap;
  overflow-x: auto;
}
.cp__chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 26rpx;
  border-radius: 999rpx;
  background: #fff;
  font-size: 24rpx;
  color: var(--text-secondary);
  box-shadow: 0 4rpx 12rpx rgba(31, 41, 55, 0.04);
}
.cp__chip-label {
  font-size: 24rpx;
  line-height: 1;
}
.cp__chip-x {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.86);
  line-height: 1;
}
.cp__chip--active {
  color: #fff;
  background: var(--brand-gradient);
  box-shadow: 0 8rpx 18rpx rgba(46, 156, 93, 0.3);
}
.cp__chip--active .cp__chip-label {
  font-weight: 700;
}

/* empty / loading */
.cp__msg {
  padding: 120rpx 24rpx;
  text-align: center;
  color: var(--text-muted);
  font-size: 26rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.cp__msg-text {
  font-size: 28rpx;
  color: var(--text-secondary);
}
.cp__msg-hint {
  font-size: 24rpx;
  color: var(--brand-primary);
  margin-top: 8rpx;
}

/* coupon card */
.cp__list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}
.cp__card {
  display: flex;
  align-items: stretch;
  background: #fff;
  border-radius: 22rpx;
  overflow: hidden;
  box-shadow: 0 10rpx 28rpx rgba(31, 41, 55, 0.06);
  position: relative;
}
.cp__card--mute {
  opacity: 0.55;
}
.cp__card-l {
  width: 200rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 24rpx 12rpx;
  color: #fff;
  background: var(--brand-gradient);
  position: relative;
}
.cp__card-l::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  right: -10rpx;
  width: 20rpx;
  background-image: radial-gradient(circle at 10rpx 12rpx, #fff 6rpx, transparent 6rpx);
  background-size: 20rpx 24rpx;
  background-repeat: repeat-y;
}
.cp__card-amt {
  font-size: 48rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
}
.cp__card-cond {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.92);
}
.cp__card-r {
  flex: 1;
  padding: 20rpx 24rpx 20rpx 28rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8rpx;
  min-width: 0;
}
.cp__card-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.cp__card-tag {
  font-size: 20rpx;
  color: var(--brand-primary);
  background: #fff1e6;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  font-weight: 600;
  flex-shrink: 0;
}
.cp__card-name {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cp__card-period {
  font-size: 22rpx;
  color: var(--text-muted);
}
.cp__card-stock {
  font-size: 22rpx;
  color: #ff8c42;
}
.cp__card-status {
  margin-top: 4rpx;
}
.cp__card-badge {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
}
.cp__card-badge--ok {
  color: var(--brand-primary);
  background: #fff1e6;
}
.cp__card-badge--mute {
  color: var(--text-muted);
  background: #f0f3f6;
}

/* 领取按钮 */
.cp__claim {
  align-self: center;
  margin-right: 24rpx;
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  background: var(--brand-gradient);
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
  box-shadow: 0 8rpx 18rpx rgba(46, 156, 93, 0.28);
  flex-shrink: 0;
}
.cp__claim--disabled {
  background: #e5e7eb;
  color: #9aa1ab;
  box-shadow: none;
}
</style>
