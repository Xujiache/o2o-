<script setup lang="ts">
/**
 * 商家"我的"中心 — 三组功能聚合:
 *   店铺管理:店铺设置 / 配送范围 / 商品分类 / 评价回复
 *   财务管理:结算记录 / 提现 / 提现记录 / 数据导出
 *   账号:入驻进度 / 退出
 */
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';

import { getStore, type StoreVo } from '@/api';
import FloatTabBar from '@/components/common/FloatTabBar.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const store = ref<StoreVo | null>(null);

async function load(): Promise<void> {
  const r = await getStore();
  if (r.code === '0' && r.data) store.value = r.data;
}

onShow(() => {
  uni.hideTabBar({ animation: false });
  void load();
});

interface MenuItem {
  key: string;
  icon: string;
  label: string;
  desc?: string;
  url: string;
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
  { key: 'categories', icon: 'list', label: '商品分类', desc: '管理菜品分类树', url: '/pages/products/categories' },
  { key: 'reviews', icon: 'star', label: '评价回复', desc: '查看用户评价并回复', url: '/pages/reviews/list' },
];

const FINANCE_GROUP: MenuItem[] = [
  {
    key: 'settlements',
    icon: 'credit-card',
    label: '结算记录',
    desc: '查看每日结算单',
    url: '/pages/settlements/list',
  },
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
  {
    key: 'exports',
    icon: 'shopping-bag',
    label: '数据导出',
    desc: '订单 / 营收 Excel 导出',
    url: '/pages/exports/index',
  },
];

const ACCOUNT_GROUP: MenuItem[] = [
  { key: 'onboarding', icon: 'clipboard', label: '入驻进度', url: '/pages/onboarding/apply' },
];

function go(item: MenuItem): void {
  uni.navigateTo({ url: item.url });
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

function firstChar(s: string | null | undefined): string {
  return s ? s.slice(0, 1) : '商';
}
</script>

<template>
  <view class="me">
    <!-- 顶部商家卡 -->
    <view class="me__hero">
      <view class="me__hero-row">
        <view class="me__avatar">{{ firstChar(store?.name) }}</view>
        <view class="me__hero-main">
          <text class="me__hero-name">{{ store?.name ?? '未入驻商家' }}</text>
          <view class="me__hero-tags">
            <text class="me__hero-tag" :class="`me__hero-tag--${auth.accountStatus || 'unknown'}`">
              {{ auth.accountStatus === 'active' ? '账号正常' : auth.accountStatus || '未登录' }}
            </text>
            <text v-if="store?.businessStatus" class="me__hero-tag me__hero-tag--biz">
              {{
                store.businessStatus === 'online' ? '营业中' : store.businessStatus === 'paused' ? '平台暂停' : '已休业'
              }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 店铺管理 -->
    <view class="me__section">
      <text class="me__section-title">店铺管理</text>
      <view class="me__group">
        <view v-for="item in STORE_GROUP" :key="item.key" class="me__item" @tap="go(item)">
          <view class="me__item-icon"><SvgIcon :name="item.icon" :size="32" color="#b7791f" /></view>
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
      <text class="me__section-title">财务管理</text>
      <view class="me__group">
        <view v-for="item in FINANCE_GROUP" :key="item.key" class="me__item" @tap="go(item)">
          <view class="me__item-icon"><SvgIcon :name="item.icon" :size="32" color="#b7791f" /></view>
          <view class="me__item-main">
            <text class="me__item-label">{{ item.label }}</text>
            <text v-if="item.desc" class="me__item-desc">{{ item.desc }}</text>
          </view>
          <text class="me__item-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 账号 -->
    <view class="me__section">
      <text class="me__section-title">账号</text>
      <view class="me__group">
        <view v-for="item in ACCOUNT_GROUP" :key="item.key" class="me__item" @tap="go(item)">
          <view class="me__item-icon"><SvgIcon :name="item.icon" :size="32" color="#b7791f" /></view>
          <view class="me__item-main">
            <text class="me__item-label">{{ item.label }}</text>
          </view>
          <text class="me__item-arrow">›</text>
        </view>
        <view class="me__item me__item--danger" @tap="logout">
          <view class="me__item-icon"><SvgIcon name="x" :size="32" color="#d33" /></view>
          <view class="me__item-main">
            <text class="me__item-label">退出登录</text>
          </view>
          <text class="me__item-arrow">›</text>
        </view>
      </view>
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

/* 顶部 hero */
.me__hero {
  padding: 48rpx 28rpx 64rpx;
  background: linear-gradient(135deg, #1f2937 0%, #b7791f 100%);
  color: #fff;
}
.me__hero-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.me__avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 52rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 4rpx rgba(255, 255, 255, 0.16);
}
.me__hero-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  min-width: 0;
}
.me__hero-name {
  font-size: 36rpx;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.me__hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}
.me__hero-tag {
  padding: 4rpx 16rpx;
  font-size: 20rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-weight: 600;
}
.me__hero-tag--active {
  background: rgba(56, 239, 125, 0.92);
  color: #064f30;
}
.me__hero-tag--biz {
  background: rgba(255, 255, 255, 0.32);
}

/* 分组 */
.me__section {
  margin: 28rpx 24rpx 0;
}
.me__section:first-of-type {
  margin-top: -36rpx;
  position: relative;
  z-index: 2;
}
.me__section-title {
  display: block;
  padding: 0 8rpx 14rpx;
  font-size: 24rpx;
  color: #8a94a6;
  font-weight: 600;
  letter-spacing: 1rpx;
}
.me__group {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 12rpx 32rpx rgba(31, 41, 55, 0.06);
}
.me__item {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.05);
}
.me__item:last-child {
  border-bottom: none;
}
.me__item:active {
  background: rgba(31, 41, 55, 0.03);
}
.me__item-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, rgba(183, 121, 31, 0.12), rgba(31, 41, 55, 0.08));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
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
  font-size: 28rpx;
  font-weight: 600;
  color: #172033;
}
.me__item-desc {
  font-size: 22rpx;
  color: #8a94a6;
  line-height: 1.4;
}
.me__item-arrow {
  color: #c5c9d2;
  font-size: 36rpx;
  flex-shrink: 0;
}
.me__item--danger .me__item-label {
  color: #d33;
}
.me__item--danger .me__item-icon {
  background: rgba(255, 77, 79, 0.08);
}
</style>
