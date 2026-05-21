<script setup lang="ts">
/**
 * 通用顶部导航栏(GR-8)
 *
 * 适配 customer-app uni-app H5/小程序/APP,统一处理:
 * - 返回按钮(getCurrentPages > 1 走 navigateBack;否则根据 fallback 跳转)
 * - iOS 安全区状态栏(--status-bar-height 自动补 padding-top)
 * - 三种渲染模式:
 *    solid  白底 + 黑字 + 灰返回箭头(默认,适合无 hero 的内容页)
 *    float  透明覆盖在 hero 上,半透明圆形按钮 + 自定义文字色(适合有渐变 hero 的页)
 *    hidden 不占空间(动态隐藏场景)
 * - 右侧 default slot 可放自定义按钮(如「分享」「搜索」)
 */
import { computed } from 'vue';

interface Props {
  /** 页面标题(float 模式可留空,标题由 hero 自绘) */
  title?: string;
  /** 渲染模式 */
  mode?: 'solid' | 'float' | 'hidden';
  /** 显示返回按钮(默认 true) */
  backVisible?: boolean;
  /**
   * 返回按钮行为:
   * - 'auto': 优先 navigateBack;若 getCurrentPages().length === 1 则 reLaunch 到 fallback
   * - 'redirect:/pages/xxx': 强制 redirectTo 到指定路径
   * - 'switchTab:/pages/xxx': 强制 switchTab 到 tabBar 页
   * - 'reLaunch:/pages/xxx': 强制 reLaunch
   */
  back?: string;
  /** float 模式下标题/箭头颜色,默认白色 */
  color?: string;
  /** solid 模式下背景色,默认白 */
  bg?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  mode: 'solid',
  backVisible: true,
  back: 'auto',
  color: 'var(--text-primary)',
  bg: '#ffffff',
});

const isHidden = computed<boolean>(() => props.mode === 'hidden');
const isFloat = computed<boolean>(() => props.mode === 'float');

const arrowColor = computed<string>(() => (isFloat.value ? props.color : 'var(--text-secondary)'));
const titleColor = computed<string>(() => (isFloat.value ? props.color : 'var(--text-primary)'));
const bgStyle = computed<string>(() => (isFloat.value ? 'transparent' : props.bg));

const FALLBACK_TABBAR_HOME = '/pages/grocery/home/index';

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
  // auto
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
  <!-- 占位 spacer 避免内容被 NavBar 覆盖(仅 solid 时;float 模式覆盖在 hero 上不占位) -->
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
  background: rgba(23, 32, 51, 0.08);
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
