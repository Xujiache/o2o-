<script setup lang="ts">
import SvgIcon from '@/components/common/SvgIcon.vue';

interface Props {
  active: 'workbench' | 'hall' | 'tasks' | 'earnings' | 'profile';
}
defineProps<Props>();

interface Tab {
  key: 'workbench' | 'hall' | 'tasks' | 'earnings' | 'profile';
  icon: string;
  label: string;
  path: string;
}

const TABS: Tab[] = [
  { key: 'workbench', icon: 'layout-grid', label: '工作台', path: '/pages/workbench/index' },
  { key: 'hall', icon: 'radio-tower', label: '大厅', path: '/pages/tasks/hall' },
  { key: 'tasks', icon: 'motorcycle', label: '任务', path: '/pages/tasks/current' },
  { key: 'earnings', icon: 'wallet', label: '收益', path: '/pages/earnings/index' },
  { key: 'profile', icon: 'user', label: '我的', path: '/pages/profile/index' },
];

const ACTIVE_COLOR = '#2e9c5d';
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
        <SvgIcon :name="t.icon" :size="40" :color="active === t.key ? ACTIVE_COLOR : INACTIVE_COLOR" />
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
  padding: 14rpx 10rpx;
  gap: 2rpx;
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
  padding: 10rpx 4rpx;
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
