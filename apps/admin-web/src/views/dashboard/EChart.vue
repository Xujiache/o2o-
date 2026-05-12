<script setup lang="ts">
import * as echarts from 'echarts/core';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{
  option: Record<string, unknown>;
  height?: string;
  loading?: boolean;
}>();

const el = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;

function update(): void {
  if (chart) chart.setOption(props.option, true);
}
function onResize(): void {
  chart?.resize();
}

onMounted(() => {
  if (!el.value) return;
  chart = echarts.init(el.value, undefined, { renderer: 'canvas' });
  chart.setOption(props.option);
  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  chart?.dispose();
  chart = null;
});

watch(
  () => props.option,
  () => update(),
  { deep: true },
);
watch(
  () => props.loading,
  (v) => {
    if (v) chart?.showLoading({ text: '', maskColor: 'rgba(7, 10, 16, 0.4)', textColor: '#98a3b6' });
    else chart?.hideLoading();
  },
);
</script>

<template>
  <div ref="el" class="echart-host" :style="{ height: height ?? '260px' }" />
</template>

<style scoped>
.echart-host {
  width: 100%;
}
</style>
