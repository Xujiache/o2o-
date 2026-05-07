<script setup lang="ts">
/**
 * 商家工作台 — 进店第一眼:
 *  - 营业开关(快速切换)
 *  - 今日核心数据(订单数 / 营收 / 待处理)
 *  - 6 个高频快捷入口(待接单 / 售后 / 评价 / 商品 / 促销 / 库存)
 * 长尾的店铺设置 / 配送 / 财务 / 数据导出请去"我的"或对应 tab.
 */
import { onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';

import FloatTabBar from '@/components/common/FloatTabBar.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';

import { getStore, setBusinessStatus, type StoreVo } from '@/api';

const store = ref<StoreVo | null>(null);
const loading = ref(false);
const switching = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await getStore();
    if (r.code === '0' && r.data) store.value = r.data;
  } finally {
    loading.value = false;
  }
}

onShow(() => {
  uni.hideTabBar({ animation: false });
  void load();
});

const isOnline = computed<boolean>(() => store.value?.businessStatus === 'online');
const isPausedByPlatform = computed<boolean>(() => store.value?.businessStatus === 'paused');

const todayString = computed<string>(() => {
  const d = new Date();
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 · 周${['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}`;
});

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
    await load();
  } finally {
    switching.value = false;
  }
}

interface Quick {
  key: string;
  icon: string;
  label: string;
  url: string;
  color: string;
  isTab?: boolean;
}

const QUICKS: Quick[] = [
  { key: 'pending', icon: 'bell', label: '待接单', url: '/pages/orders/pending', color: '#ff7a45', isTab: true },
  { key: 'after-sales', icon: 'life-buoy', label: '售后申请', url: '/pages/after-sales/list', color: '#fa709a' },
  { key: 'reviews', icon: 'star', label: '评价回复', url: '/pages/reviews/list', color: '#f7971e' },
  { key: 'products', icon: 'package', label: '商品管理', url: '/pages/products/list', color: '#5b5ff8', isTab: true },
  { key: 'promotions', icon: 'gift', label: '促销活动', url: '/pages/promotions/list', color: '#11998e' },
  { key: 'stock', icon: 'alert-triangle', label: '库存预警', url: '/pages/stock/alerts', color: '#ed6c02' },
];

function go(q: Quick): void {
  if (q.isTab) {
    uni.switchTab({ url: q.url });
  } else {
    uni.navigateTo({ url: q.url });
  }
}

function gotoOnboarding(): void {
  uni.navigateTo({ url: '/pages/onboarding/apply' });
}
</script>

<template>
  <view class="wb">
    <!-- Hero:店铺信息 + 营业开关 -->
    <view class="wb__hero">
      <view class="wb__hero-row">
        <view class="wb__hero-main">
          <text class="wb__hero-date">{{ todayString }}</text>
          <text v-if="store" class="wb__hero-store">{{ store.name }}</text>
          <text v-else-if="loading" class="wb__hero-store">加载中…</text>
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

    <!-- 今日数据 -->
    <view class="wb__stats">
      <view class="wb__stat">
        <text class="wb__stat-value">--</text>
        <text class="wb__stat-label">今日订单</text>
      </view>
      <view class="wb__stat">
        <text class="wb__stat-value">¥ --</text>
        <text class="wb__stat-label">今日营收</text>
      </view>
      <view class="wb__stat wb__stat--alert">
        <text class="wb__stat-value">--</text>
        <text class="wb__stat-label">待处理</text>
      </view>
    </view>

    <!-- 快捷操作 -->
    <view class="wb__section">
      <text class="wb__section-title">常用功能</text>
      <view class="wb__quicks">
        <view v-for="q in QUICKS" :key="q.key" class="wb__quick" @tap="go(q)">
          <view class="wb__quick-icon" :style="`background: ${q.color}1a;`">
            <SvgIcon :name="q.icon" :size="36" :color="q.color" />
          </view>
          <text class="wb__quick-label">{{ q.label }}</text>
        </view>
      </view>
    </view>

    <!-- 提示卡 -->
    <view class="wb__tip">
      <SvgIcon name="lightbulb" :size="26" color="#ffb400" />
      <text class="wb__tip-text">店铺设置 / 配送范围 / 结算提现 / 数据导出 已搬到「我的」</text>
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
  padding: 40rpx 28rpx 56rpx;
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

/* 营业开关 — 大号 pill,状态色 */
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

/* 今日数据 */
.wb__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14rpx;
  padding: 0 24rpx;
  margin-top: -28rpx;
  position: relative;
  z-index: 2;
}
.wb__stat {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  box-shadow: 0 14rpx 38rpx rgba(31, 41, 55, 0.08);
}
.wb__stat-value {
  font-size: 36rpx;
  font-weight: 800;
  color: #172033;
  line-height: 1;
}
.wb__stat-label {
  font-size: 22rpx;
  color: #8a94a6;
}
.wb__stat--alert .wb__stat-value {
  color: #ed6c02;
}

/* 快捷功能 */
.wb__section {
  margin: 32rpx 24rpx 0;
  padding: 28rpx 24rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, 0.05);
}
.wb__section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
  margin-bottom: 20rpx;
}
.wb__quicks {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}
.wb__quick {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 12rpx 0;
}
.wb__quick-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
}
.wb__quick-label {
  font-size: 22rpx;
  color: #5a6275;
  font-weight: 600;
}

/* 引导提示 */
.wb__tip {
  margin: 24rpx 24rpx 0;
  padding: 20rpx 24rpx;
  background: rgba(91, 95, 248, 0.06);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.wb__tip-icon {
  font-size: 28rpx;
}
.wb__tip-text {
  flex: 1;
  font-size: 22rpx;
  color: #5a6275;
  line-height: 1.5;
}
</style>
