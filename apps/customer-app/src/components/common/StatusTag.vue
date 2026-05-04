<script setup lang="ts">
/**
 * 状态标签:从 /pub/dictionaries 拉取后端枚举,根据 dictType+code 渲染中文标签。
 * 禁止前端硬编码中文 — 来源:前端页面与接口对接.md "状态展示必须引用后端枚举"。
 */
import { computed, onMounted } from 'vue';

import { useDictStore } from '@/stores/dict';

const props = withDefaults(
  defineProps<{
    dictType: string;
    code: string;
    /** 视觉色;未传则按规则推断 */
    color?: 'default' | 'success' | 'warning' | 'danger';
  }>(),
  { color: 'default' },
);

const store = useDictStore();

onMounted(() => {
  if (!store.byType[props.dictType]) {
    store.load([props.dictType]);
  }
});

const label = computed(() => store.label(props.dictType, props.code));

const tone = computed(() => {
  if (props.color !== 'default') return props.color;
  const c = props.code.toLowerCase();
  if (c.includes('cancelled') || c.includes('failed') || c.includes('refunded')) return 'danger';
  if (c.includes('completed') || c.includes('delivered')) return 'success';
  if (c.includes('pending') || c.includes('paying') || c.includes('preparing')) return 'warning';
  return 'default';
});
</script>

<template>
  <view :class="['status-tag', `status-tag--${tone}`]">{{ label }}</view>
</template>

<style scoped>
.status-tag {
  display: inline-block;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  line-height: 1.4;
}
.status-tag--default {
  background: #f0f0f0;
  color: #666;
}
.status-tag--success {
  background: #e6f4ea;
  color: #1e8e3e;
}
.status-tag--warning {
  background: #fef7e0;
  color: #e37400;
}
.status-tag--danger {
  background: #fce8e6;
  color: #d93025;
}
</style>
