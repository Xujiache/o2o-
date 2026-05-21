<script setup lang="ts">
/**
 * 通用顶部导航栏(GR-8) — rider-app
 *
 * 适配 uni-app H5/小程序/APP,统一处理返回按钮 + iOS 安全区,
 * 三种模式 solid / float / hidden,品牌色生鲜绿 #2e9c5d。
 */
import { computed } from 'vue';

interface Props {
  title?: string;
  mode?: 'solid' | 'float' | 'hidden';
  backVisible?: boolean;
  back?: string;
  color?: string;
  bg?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  mode: 'solid',
  backVisible: true,
  back: 'auto',
  color: '#172033',
  bg: '#ffffff',
});

const isHidden = computed<boolean>(() => props.mode === 'hidden');
const isFloat = computed<boolean>(() => props.mode === 'float');

const arrowColor = computed<string>(() => (isFloat.value ? props.color : '#5a6275'));
const titleColor = computed<string>(() => (isFloat.value ? props.color : '#172033'));
const bgStyle = computed<string>(() => (isFloat.value ? 'transparent' : props.bg));

const FALLBACK_TABBAR_HOME = '/pages/workbench/index';

function onBack(): void {
  if (props.back.startsWith('redirect:')) {
    uni.redirectTo({ url: props.back.replace('redirect:', '') });
    return;
  }
  if (props.back.startsWith('switchTab:')) {
    uni.switchTab({ url: props.back.replace('switchTab:', '') });
    return;
  }
  if (props.back.startsWith('reLaunch:')) {
    uni.reLaunch({ url: props.back.replace('reLaunch:', '') });
    return;
  }
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 });
  } else {
    uni.reLaunch({ url: FALLBACK_TABBAR_HOME });
  }
}
</script>

<template>
  <view v-if="!isHidden" class="nav-bar" :class="['nav-bar--' + mode]" :style="{ background: bgStyle }">
    <view class="nav-bar__safe" />
    <view class="nav-bar__inner">
      <view v-if="backVisible" class="nav-bar__back" :class="{ 'nav-bar__back--float': isFloat }" @tap="onBack">
        <svg viewBox="0 0 24 24" class="nav-bar__arrow" :style="{ color: arrowColor }">
          <path
            d="M15 6l-6 6 6 6"
            fill="none"
            :stroke="arrowColor"
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </view>
      <view v-else class="nav-bar__back-placeholder" />
      <view class="nav-bar__title" :style="{ color: titleColor }">{{ title }}</view>
      <view class="nav-bar__right">
        <slot />
      </view>
    </view>
  </view>
  <view v-if="!isHidden && !isFloat" class="nav-bar__spacer" />
</template>

<style scoped>
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  display: flex;
  flex-direction: column;
}
.nav-bar--solid {
  box-shadow: 0 1rpx 0 rgba(23, 32, 51, 0.06);
}
.nav-bar--float {
  background: transparent !important;
  box-shadow: none;
}
.nav-bar__safe {
  height: var(--status-bar-height, 0);
}
.nav-bar__inner {
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 16rpx;
}
.nav-bar__back,
.nav-bar__back-placeholder {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
}
.nav-bar__back--float {
  background: rgba(255, 255, 255, 0.32);
  backdrop-filter: blur(8px);
}
.nav-bar__back:active {
  background: rgba(46, 156, 93, 0.1);
}
.nav-bar__back--float:active {
  background: rgba(255, 255, 255, 0.45);
}
.nav-bar__arrow {
  width: 40rpx;
  height: 40rpx;
}
.nav-bar__title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 700;
  margin: 0 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nav-bar__right {
  min-width: 72rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.nav-bar__spacer {
  height: calc(var(--status-bar-height, 0) + 88rpx);
}
</style>
