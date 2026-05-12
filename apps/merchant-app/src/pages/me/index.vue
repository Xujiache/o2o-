<script setup lang="ts">
/**
 * 商家"我的"中心
 *  - Hero:店铺头像/名称/状态(真实数据)
 *  - 经营快览:评分 / 本月订单 / 本月营收(真实数据)
 *  - 店铺信息:起送价 / 配送费 / 配送区域数
 *  - 三组功能:店铺管理 / 财务管理 / 账号
 */
import { onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';

import { getStore, type StoreVo } from '@/api';
import { getStatistics, type StatisticsVo } from '@/api/statistics';
import FloatTabBar from '@/components/common/FloatTabBar.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const store = ref<StoreVo | null>(null);
const monthStat = ref<StatisticsVo | null>(null);

async function load(): Promise<void> {
  const [s, m] = await Promise.all([getStore(), getStatistics('MONTH')]);
  if (s.code === '0' && s.data) store.value = s.data;
  if (m.code === '0' && m.data) monthStat.value = m.data;
}

onShow(() => {
  uni.hideTabBar({ animation: false });
  void load();
});

const statusLabel = computed<string>(() => {
  const a = auth.accountStatus;
  if (a === 'active') return '账号正常';
  if (a === 'pending') return '审核中';
  if (a === 'disabled') return '账号停用';
  return '未登录';
});

const bizLabel = computed<string>(() => {
  const s = store.value?.businessStatus;
  if (s === 'online') return '营业中';
  if (s === 'paused') return '平台暂停';
  if (s === 'offline') return '已休业';
  return '未开店';
});

const ratingValue = computed<number>(() => Number(monthStat.value?.storeRating ?? 0));
const ratingStars = computed<Array<'full' | 'half' | 'empty'>>(() => {
  const v = ratingValue.value;
  return [1, 2, 3, 4, 5].map((i) => (v >= i - 0.25 ? 'full' : v >= i - 0.75 ? 'half' : 'empty'));
});

const monthOrders = computed<number>(() => monthStat.value?.orderCount ?? 0);
const monthGrossYuan = computed<string>(() => (Number(monthStat.value?.grossCents ?? 0) / 100).toFixed(2));
const minOrderYuan = computed<string>(() => (Number(store.value?.minOrderAmount ?? 0) / 100).toFixed(2));
const deliveryFeeYuan = computed<string>(() => (Number(store.value?.deliveryFee ?? 0) / 100).toFixed(2));
const areaCount = computed<number>(() => store.value?.deliveryAreas?.length ?? 0);

interface MenuItem {
  key: string;
  icon: string;
  label: string;
  desc?: string;
  url: string;
  badge?: string;
}

const STORE_GROUP: MenuItem[] = [
  {
    key: 'settings',
    icon: 'store',
    label: '店铺设置',
    desc: '封面、名称、起送、配送费、公告',
    url: '/pages/store/settings',
  },
  {
    key: 'delivery',
    icon: 'motorcycle',
    label: '配送范围',
    desc: '设置外送区域多边形',
    url: '/pages/store/delivery-area',
  },
  {
    key: 'categories',
    icon: 'layout-grid',
    label: '商品分类',
    desc: '管理菜品分类树',
    url: '/pages/products/categories',
  },
  { key: 'reviews', icon: 'star', label: '评价回复', desc: '查看用户评价并回复', url: '/pages/reviews/list' },
];

const FINANCE_GROUP: MenuItem[] = [
  { key: 'settlements', icon: 'wallet', label: '结算记录', desc: '查看每日结算单', url: '/pages/settlements/list' },
  {
    key: 'withdraw',
    icon: 'credit-card',
    label: '申请提现',
    desc: '把可提现金额转到银行卡',
    url: '/pages/withdrawals/form',
  },
  {
    key: 'withdraw-records',
    icon: 'clipboard',
    label: '提现记录',
    desc: '历史提现单',
    url: '/pages/withdrawals/records',
  },
  { key: 'exports', icon: 'file-edit', label: '数据导出', desc: '订单 / 营收 Excel 导出', url: '/pages/exports/index' },
];

const ACCOUNT_GROUP: MenuItem[] = [
  {
    key: 'onboarding',
    icon: 'clipboard',
    label: '入驻进度',
    desc: '资质审核与商家状态',
    url: '/pages/onboarding/apply',
  },
];

function go(item: MenuItem): void {
  uni.navigateTo({ url: item.url });
}

function gotoSettings(): void {
  uni.navigateTo({ url: '/pages/store/settings' });
}

function logout(): void {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出当前账号吗?',
    success: (res) => {
      if (!res.confirm) return;
      void auth.logout();
      uni.reLaunch({ url: '/pages/login/index' });
    },
  });
}

function showContactSupport(): void {
  uni.showModal({
    title: '联系客服',
    content: '客服热线:400-000-0000\n工作时间 9:00-22:00',
    showCancel: false,
  });
}

function showAbout(): void {
  uni.showModal({
    title: '关于 O2O 商家端',
    content: '版本 1.0.0\n© 2026 O2O 平台',
    showCancel: false,
  });
}

function firstChar(s: string | null | undefined): string {
  return s ? s.slice(0, 1) : '商';
}
</script>

<template>
  <view class="me">
    <!-- Hero -->
    <view class="me__hero">
      <view class="me__hero-row">
        <view class="me__avatar">
          <image v-if="store?.avatarUrl" :src="store.avatarUrl" class="me__avatar-img" mode="aspectFill" />
          <text v-else class="me__avatar-letter">{{ firstChar(store?.name) }}</text>
        </view>
        <view class="me__hero-main">
          <text class="me__hero-name">{{ store?.name ?? '未入驻商家' }}</text>
          <view class="me__hero-tags">
            <text class="me__hero-tag" :class="`me__hero-tag--${auth.accountStatus || 'unknown'}`">
              {{ statusLabel }}
            </text>
            <text v-if="store?.businessStatus" class="me__hero-tag me__hero-tag--biz">
              <view class="me__hero-tag-dot" :class="`me__hero-tag-dot--${store.businessStatus}`" />
              <text>{{ bizLabel }}</text>
            </text>
          </view>
          <text v-if="store?.intro" class="me__hero-intro">{{ store.intro }}</text>
        </view>
        <view v-if="store" class="me__hero-edit" @tap="gotoSettings">
          <SvgIcon name="file-edit" :size="22" color="rgba(255,255,255,0.92)" />
        </view>
      </view>
    </view>

    <!-- 经营快览 -->
    <view class="me__stats">
      <view class="me__stat">
        <view class="me__stat-row">
          <text class="me__stat-val">{{ ratingValue.toFixed(2) }}</text>
        </view>
        <view class="me__stat-stars">
          <SvgIcon
            v-for="(s, i) in ratingStars"
            :key="i"
            name="star"
            :size="14"
            :color="s === 'empty' ? '#dde2ea' : '#f7971e'"
          />
        </view>
        <text class="me__stat-label">店铺评分</text>
      </view>
      <view class="me__stat-divider" />
      <view class="me__stat">
        <text class="me__stat-val">{{ monthOrders }}</text>
        <text class="me__stat-label">本月订单</text>
      </view>
      <view class="me__stat-divider" />
      <view class="me__stat">
        <text class="me__stat-val">¥{{ monthGrossYuan }}</text>
        <text class="me__stat-label">本月营收</text>
      </view>
    </view>

    <!-- 店铺信息 -->
    <view v-if="store" class="me__section">
      <view class="me__section-head">
        <view class="me__section-bar" />
        <text class="me__section-title">店铺信息</text>
        <text class="me__section-tip" @tap="gotoSettings">编辑 ›</text>
      </view>
      <view class="me__info">
        <view class="me__info-row">
          <text class="me__info-label">起送价</text>
          <text class="me__info-val">¥{{ minOrderYuan }}</text>
        </view>
        <view class="me__info-row">
          <text class="me__info-label">配送费</text>
          <text class="me__info-val">¥{{ deliveryFeeYuan }}</text>
        </view>
        <view class="me__info-row">
          <text class="me__info-label">配送区域</text>
          <text class="me__info-val">{{ areaCount }} 个</text>
        </view>
        <view v-if="store.businessScope" class="me__info-row">
          <text class="me__info-label">经营范围</text>
          <text class="me__info-val">{{ store.businessScope }}</text>
        </view>
      </view>
    </view>

    <!-- 店铺管理 -->
    <view class="me__section">
      <view class="me__section-head">
        <view class="me__section-bar" />
        <text class="me__section-title">店铺管理</text>
      </view>
      <view class="me__list">
        <view v-for="item in STORE_GROUP" :key="item.key" class="me__item" @tap="go(item)">
          <view class="me__item-icon">
            <SvgIcon :name="item.icon" :size="24" color="#b7791f" />
          </view>
          <view class="me__item-main">
            <text class="me__item-label">{{ item.label }}</text>
            <text v-if="item.desc" class="me__item-desc">{{ item.desc }}</text>
          </view>
          <text class="me__item-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 财务管理 -->
    <view class="me__section">
      <view class="me__section-head">
        <view class="me__section-bar" />
        <text class="me__section-title">财务管理</text>
      </view>
      <view class="me__list">
        <view v-for="item in FINANCE_GROUP" :key="item.key" class="me__item" @tap="go(item)">
          <view class="me__item-icon">
            <SvgIcon :name="item.icon" :size="24" color="#b7791f" />
          </view>
          <view class="me__item-main">
            <text class="me__item-label">{{ item.label }}</text>
            <text v-if="item.desc" class="me__item-desc">{{ item.desc }}</text>
          </view>
          <text class="me__item-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 账号与帮助 -->
    <view class="me__section">
      <view class="me__section-head">
        <view class="me__section-bar" />
        <text class="me__section-title">账号与帮助</text>
      </view>
      <view class="me__list">
        <view v-for="item in ACCOUNT_GROUP" :key="item.key" class="me__item" @tap="go(item)">
          <view class="me__item-icon">
            <SvgIcon :name="item.icon" :size="24" color="#b7791f" />
          </view>
          <view class="me__item-main">
            <text class="me__item-label">{{ item.label }}</text>
            <text v-if="item.desc" class="me__item-desc">{{ item.desc }}</text>
          </view>
          <text class="me__item-arrow">›</text>
        </view>
        <view class="me__item" @tap="showContactSupport">
          <view class="me__item-icon">
            <SvgIcon name="life-buoy" :size="24" color="#b7791f" />
          </view>
          <view class="me__item-main">
            <text class="me__item-label">联系客服</text>
            <text class="me__item-desc">遇到问题?我们在线为您解答</text>
          </view>
          <text class="me__item-arrow">›</text>
        </view>
        <view class="me__item" @tap="showAbout">
          <view class="me__item-icon">
            <SvgIcon name="lightbulb" :size="24" color="#b7791f" />
          </view>
          <view class="me__item-main">
            <text class="me__item-label">关于</text>
            <text class="me__item-desc">版本信息</text>
          </view>
          <text class="me__item-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 退出 -->
    <view class="me__logout" @tap="logout">
      <SvgIcon name="x" :size="22" color="#c0392b" />
      <text class="me__logout-text">退出登录</text>
    </view>

    <!-- 底部版本 -->
    <view class="me__foot">
      <text class="me__foot-text">O2O 商家端 · 版本 1.0.0</text>
    </view>
    <FloatTabBar active="me" />
  </view>
</template>

<style scoped>
.me {
  min-height: 100vh;
  padding: 0 0 200rpx;
  background: #f5f6f8;
}

/* Hero */
.me__hero {
  padding: 40rpx 28rpx 64rpx;
  background: linear-gradient(135deg, #1f2937 0%, #b7791f 100%);
  color: #fff;
}
.me__hero-row {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}
.me__avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.18);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 2rpx rgba(255, 255, 255, 0.22);
}
.me__avatar-img {
  width: 100%;
  height: 100%;
}
.me__avatar-letter {
  color: #fff;
  font-size: 52rpx;
  font-weight: 800;
}
.me__hero-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  min-width: 0;
  padding-top: 4rpx;
}
.me__hero-name {
  font-size: 36rpx;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.5rpx;
}
.me__hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}
.me__hero-tag {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 14rpx;
  font-size: 20rpx;
  border-radius: 6rpx;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-weight: 600;
}
.me__hero-tag--active {
  background: rgba(56, 239, 125, 0.92);
  color: #064f30;
}
.me__hero-tag--disabled {
  background: rgba(255, 77, 79, 0.9);
}
.me__hero-tag--biz {
  background: rgba(255, 255, 255, 0.22);
}
.me__hero-tag-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #fff;
}
.me__hero-tag-dot--online {
  background: #38ef7d;
  box-shadow: 0 0 0 3rpx rgba(56, 239, 125, 0.32);
}
.me__hero-tag-dot--paused {
  background: #ff4d4f;
}
.me__hero-tag-dot--offline {
  background: rgba(255, 255, 255, 0.6);
}
.me__hero-intro {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.72);
  margin-top: 4rpx;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.me__hero-edit {
  width: 60rpx;
  height: 60rpx;
  border-radius: 12rpx;
  background: rgba(255, 255, 255, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 经营快览 — 与工作台同款 */
.me__stats {
  margin: -36rpx 24rpx 0;
  display: flex;
  align-items: stretch;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
  padding: 22rpx 16rpx;
  position: relative;
  z-index: 2;
  box-shadow: 0 12rpx 32rpx rgba(31, 41, 55, 0.06);
}
.me__stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.me__stat-row {
  display: flex;
  align-items: baseline;
}
.me__stat-val {
  font-size: 34rpx;
  font-weight: 800;
  color: #172033;
  line-height: 1;
  font-feature-settings: 'tnum';
  letter-spacing: -0.5rpx;
}
.me__stat-stars {
  display: flex;
  gap: 2rpx;
}
.me__stat-label {
  font-size: 22rpx;
  color: #8a94a6;
}
.me__stat-divider {
  width: 1rpx;
  background: #e6e9ee;
  margin: 8rpx 0;
}

/* Section 卡 — 与工作台/统计同款 */
.me__section {
  margin: 16rpx 24rpx 0;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
  padding: 22rpx 22rpx 4rpx;
}
.me__section-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding-bottom: 14rpx;
}
.me__section-bar {
  width: 6rpx;
  height: 24rpx;
  background: #b7791f;
  border-radius: 2rpx;
}
.me__section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
}
.me__section-tip {
  font-size: 22rpx;
  color: #8a94a6;
  margin-left: auto;
}

/* 店铺信息 */
.me__info {
  padding-bottom: 14rpx;
}
.me__info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx 0;
  border-top: 1rpx solid #f0f1f3;
}
.me__info-row:first-child {
  border-top: none;
}
.me__info-label {
  font-size: 24rpx;
  color: #8a94a6;
}
.me__info-val {
  font-size: 26rpx;
  color: #172033;
  font-weight: 600;
  font-feature-settings: 'tnum';
  max-width: 60%;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 列表项 */
.me__list {
  padding-bottom: 4rpx;
}
.me__item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 18rpx 0;
  border-top: 1rpx solid #f0f1f3;
}
.me__item:first-child {
  border-top: none;
}
.me__item:active {
  background: rgba(31, 41, 55, 0.02);
}
.me__item-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 10rpx;
  background: rgba(183, 121, 31, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.me__item-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}
.me__item-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #172033;
}
.me__item-desc {
  font-size: 20rpx;
  color: #8a94a6;
  line-height: 1.4;
}
.me__item-arrow {
  color: #c5c9d2;
  font-size: 36rpx;
  flex-shrink: 0;
}

/* 退出 */
.me__logout {
  margin: 16rpx 24rpx 0;
  padding: 22rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
}
.me__logout:active {
  background: #fafbfc;
}
.me__logout-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #c0392b;
}

/* 底部版本 */
.me__foot {
  margin: 24rpx 24rpx 0;
  padding: 16rpx 0;
  text-align: center;
}
.me__foot-text {
  font-size: 20rpx;
  color: #b6bfcd;
}
</style>
