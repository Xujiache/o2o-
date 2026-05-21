<script setup lang="ts">
import SvgIcon from '@/components/common/SvgIcon.vue';

interface Props {
  active: 'home' | 'orders' | 'me';
}
defineProps<Props>();

interface Tab {
  key: 'home' | 'orders' | 'me';
  icon: string;
  label: string;
  path: string;
}

const TABS: Tab[] = [
  { key: 'home', icon: 'home', label: '商城', path: '/pages/grocery/home/index' },
  { key: 'orders', icon: 'clipboard', label: '订单', path: '/pages/grocery/order/list' },
  { key: 'me', icon: 'user', label: '我的', path: '/pages/me/index' },
];

const ACTIVE_COLOR = 'var(--brand-primary)';
const INACTIVE_COLOR = 'var(--text-muted)';

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
        <SvgIcon :name="t.icon" :size="44" :color="active === t.key ? ACTIVE_COLOR : INACTIVE_COLOR" />
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
  padding: 14rpx 12rpx;
  gap: 4rpx;
  backdrop-filter: blur(12px);
  box-sizing: border-box;
}
.ftb__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  padding: 10rpx 8rpx;
  border-radius: 999rpx;
  transition: background 200ms ease;
}
.ftb__item--active {
  background: rgba(46, 156, 93, 0.12);
}
.ftb__label {
  font-size: 22rpx;
  color: var(--text-muted);
}
.ftb__label--active {
  color: var(--brand-primary);
  font-weight: 700;
}
</style>
