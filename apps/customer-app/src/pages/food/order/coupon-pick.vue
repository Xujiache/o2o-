<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import { listMyCoupons, type MyCouponItem } from '@/api/coupons';
import { useFoodOrderStore } from '@/stores/food-order';
import { formatYuan } from '@/utils/format-price';
import NavBar from '@/components/common/NavBar.vue';

interface DecoratedCoupon extends MyCouponItem {
  usable: boolean;
  reason: string;
}

const orderStore = useFoodOrderStore();

const goodsAmount = ref<bigint>(0n);
const currentCouponId = ref<string>('');
const loading = ref(false);
const items = ref<DecoratedCoupon[]>([]);

const usableList = computed(() => items.value.filter((c) => c.usable));
const unusableList = computed(() => items.value.filter((c) => !c.usable));
const hasAny = computed(() => items.value.length > 0);

function couponHead(c: MyCouponItem): string {
  if (c.couponType === 'AMOUNT') return `¥${formatYuan(c.discount)}`;
  return `${(Number(c.discount) / 100).toFixed(1)}折`;
}
function couponRule(c: MyCouponItem): string {
  const t = Number(c.threshold);
  return t > 0 ? `满 ¥${formatYuan(c.threshold)} 可用` : '无门槛';
}
function bizLabel(b: string): string {
  if (b === 'FOOD') return '外卖';
  if (b === 'ERRAND') return '跑腿';
  return '通用';
}
function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function decorate(c: MyCouponItem): DecoratedCoupon {
  // 计算可用性 — UNUSED 已被服务端过滤;这里只需校验 bizType 和门槛
  if (c.bizType === 'ERRAND') {
    return { ...c, usable: false, reason: '仅限跑腿订单' };
  }
  const threshold = BigInt(c.threshold);
  if (goodsAmount.value < threshold) {
    const diff = Number(threshold - goodsAmount.value);
    return { ...c, usable: false, reason: `还差 ¥${(diff / 100).toFixed(2)} 可用` };
  }
  return { ...c, usable: true, reason: '' };
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await listMyCoupons({ status: 'UNUSED', pageNo: 1, pageSize: 100 });
    if (r.code === '0' && r.data) {
      items.value = r.data.items.map(decorate);
    }
  } finally {
    loading.value = false;
  }
}

function pick(c: DecoratedCoupon): void {
  if (!c.usable) {
    uni.showToast({ title: c.reason || '该券暂不可用', icon: 'none' });
    return;
  }
  orderStore.pickCoupon(c.userCouponId);
  uni.navigateBack();
}

function dontUse(): void {
  // 用空串表示"主动选择不使用"(区分于"未选过"的 null)
  orderStore.pickCoupon('');
  uni.navigateBack();
}

function gotoCenter(): void {
  uni.navigateTo({ url: '/pages/me/coupons' });
}

onLoad((options) => {
  const ga = options?.goodsAmount as string | undefined;
  if (ga) {
    try {
      goodsAmount.value = BigInt(ga);
    } catch {
      goodsAmount.value = 0n;
    }
  }
  currentCouponId.value = (options?.couponId as string | undefined) ?? '';
  void load();
});
</script>

<template>
  <view class="cp">
    <NavBar title="选择优惠券" />
    <!-- 不使用券选项 -->
    <view class="cp__none" @tap="dontUse">
      <text>不使用优惠券</text>
      <view v-if="!currentCouponId" class="cp__none-mark">
        <SvgIcon name="check" :size="28" />
      </view>
    </view>

    <view v-if="loading" class="cp__msg">加载中…</view>

    <template v-else-if="!hasAny">
      <view class="cp__msg">
        <SvgIcon name="ticket" :size="100" color="#c5c9d2" />
        <text class="cp__msg-text">你还没有优惠券</text>
        <view class="cp__msg-btn" @tap="gotoCenter">去领券中心</view>
      </view>
    </template>

    <template v-else>
      <!-- 可用区 -->
      <view v-if="usableList.length > 0" class="cp__section">
        <text class="cp__section-h">本单可用 ({{ usableList.length }})</text>
        <view
          v-for="c in usableList"
          :key="c.userCouponId"
          class="cp__card"
          :class="{ 'cp__card--current': c.userCouponId === currentCouponId }"
          @tap="pick(c)"
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
            <text class="cp__card-period">有效期至 {{ fmtDate(c.validTo) }}</text>
            <text v-if="c.userCouponId === currentCouponId" class="cp__card-badge">已选</text>
          </view>
        </view>
      </view>

      <!-- 不可用区 -->
      <view v-if="unusableList.length > 0" class="cp__section">
        <text class="cp__section-h">本单不可用 ({{ unusableList.length }})</text>
        <view v-for="c in unusableList" :key="c.userCouponId" class="cp__card cp__card--mute">
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
            <text class="cp__card-reason">{{ c.reason }}</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.cp {
  min-height: 100vh;
  padding: 16rpx 24rpx 60rpx;
  background: #f6f8fb;
}

.cp__none {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  background: #fff;
  border-radius: 20rpx;
  margin-bottom: 16rpx;
  font-size: 28rpx;
  color: var(--text-primary);
  box-shadow: 0 6rpx 18rpx rgba(31, 41, 55, 0.04);
}
.cp__none-mark {
  color: var(--brand-primary);
  font-size: 32rpx;
  font-weight: 700;
}

.cp__msg {
  padding: 120rpx 24rpx;
  text-align: center;
  color: var(--text-muted);
  font-size: 26rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
}
.cp__msg-text {
  font-size: 28rpx;
  color: var(--text-secondary);
}
.cp__msg-btn {
  padding: 16rpx 36rpx;
  border-radius: 999rpx;
  background: var(--brand-gradient);
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
  margin-top: 8rpx;
  box-shadow: 0 10rpx 20rpx rgba(46, 156, 93, 0.28);
}

.cp__section {
  margin-bottom: 24rpx;
}
.cp__section-h {
  display: block;
  font-size: 24rpx;
  color: var(--text-muted);
  padding: 12rpx 4rpx;
}

.cp__card {
  display: flex;
  align-items: stretch;
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
  margin-bottom: 14rpx;
  box-shadow: 0 8rpx 22rpx rgba(31, 41, 55, 0.06);
  position: relative;
}
.cp__card--current {
  outline: 2rpx solid var(--brand-primary);
  outline-offset: -2rpx;
}
.cp__card--mute {
  filter: grayscale(0.95);
  opacity: 0.65;
}

.cp__card-l {
  width: 200rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 22rpx 12rpx;
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
.cp__card--mute .cp__card-l {
  background: linear-gradient(135deg, #b0b6bf, var(--text-muted));
}
.cp__card-amt {
  font-size: 44rpx;
  font-weight: 800;
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
  gap: 6rpx;
  justify-content: center;
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
.cp__card--mute .cp__card-tag {
  color: var(--text-muted);
  background: #eef0f3;
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
.cp__card-reason {
  font-size: 22rpx;
  color: #ff8c42;
}
.cp__card-badge {
  position: absolute;
  top: 14rpx;
  right: 20rpx;
  font-size: 20rpx;
  color: var(--brand-primary);
  background: #fff1e6;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  font-weight: 700;
}
</style>
