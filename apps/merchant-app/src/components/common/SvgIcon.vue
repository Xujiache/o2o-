<script setup lang="ts">
/**
 * 平台 SVG 图标组件 — 替代 emoji,支持任意尺寸 / 颜色。
 *   <SvgIcon name="search" :size="32" color="#ff6b35" />
 *
 * H5 端通过 v-html inline SVG 渲染;color 通过 CSS color 影响 currentColor。
 * size 单位 px(组件内部转 rpx 大小由父级控制)。
 */
import { computed } from 'vue';

import { ICONS } from './svg-icons';

interface Props {
  name: string;
  size?: number | string;
  color?: string;
  /** 描边粗细,默认 1.8 */
  strokeWidth?: number;
}
const props = withDefaults(defineProps<Props>(), {
  size: 24,
  color: 'currentColor',
  strokeWidth: 1.8,
});

const sizeStr = computed(() => (typeof props.size === 'number' ? `${props.size}rpx` : props.size));

const svg = computed(() => {
  const inner = ICONS[props.name] ?? '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="${props.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
});
</script>

<template>
  <view class="svg-icon" :style="{ width: sizeStr, height: sizeStr, color }" v-html="svg" />
</template>

<style scoped>
.svg-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  flex-shrink: 0;
}
.svg-icon :deep(svg) {
  display: block;
}
</style>
