<script setup lang="ts">
import SvgIcon from '@/components/common/SvgIcon.vue';

interface Props {
  active: 'workbench' | 'orders' | 'products' | 'grocery' | 'statistics' | 'me';
}
defineProps<Props>();

interface Tab {
  key: 'workbench' | 'orders' | 'products' | 'grocery' | 'statistics' | 'me';
  icon: string;
  label: string;
  path: string;
}

const TABS: Tab[] = [
  { key: 'workbench', icon: 'layout-grid', label: '工作台', path: '/pages/workbench/index' },
  { key: 'orders', icon: 'bell', label: '订单', path: '/pages/orders/pending' },
  { key: 'grocery', icon: 'shopping-cart', label: '商城', path: '/pages/grocery/verify' },
  { key: 'products', icon: 'package', label: '商品', path: '/pages/products/list' },
  { key: 'statistics', icon: 'chart-bar', label: '统计', path: '/pages/statistics/index' },
  { key: 'me', icon: 'user', label: '我的', path: '/pages/me/index' },
];

const ACTIVE_COLOR = '#b7791f';
const INACTIVE_COLOR = '#8a94a6';

function onTap(t: Tab): void {
  uni.switchTab({ url: t.path });
}
</script>

<template>
  <view class="ftb">
    <view class="ftb__inner">
      <view
        v-for="t in TABS"
        :key="t.key"
        class="ftb__item"
        :class="{ 'ftb__item--active': active === t.key }"
        @tap="onTap(t)"
      >
        <SvgIcon :name="t.icon" :size="36" :color="active === t.key ? ACTIVE_COLOR : INACTIVE_COLOR" />
        <text class="ftb__label" :class="{ 'ftb__label--active': active === t.key }">{{ t.label }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.ftb {
  position: fixed;
  left: 16rpx;
  right: 16rpx;
  bottom: 16rpx;
  z-index: 99;
  pointer-events: none;
}
.ftb__inner {
  pointer-events: auto;
  width: 100%;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 999rpx;
  box-shadow:
    0 18rpx 48rpx rgba(31, 41, 55, 0.18),
    0 4rpx 12rpx rgba(31, 41, 55, 0.08);
  padding: 12rpx 6rpx;
  gap: 0;
  backdrop-filter: blur(12px);
  box-sizing: border-box;
}
.ftb__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
  padding: 8rpx 2rpx;
  border-radius: 999rpx;
  transition: background 200ms ease;
}
.ftb__item--active {
  background: rgba(183, 121, 31, 0.12);
}
.ftb__label {
  font-size: 22rpx;
  color: #8a94a6;
}
.ftb__label--active {
  color: #b7791f;
  font-weight: 700;
}
</style>
