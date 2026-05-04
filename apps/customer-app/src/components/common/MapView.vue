<script setup lang="ts">
/**
 * 地图组件:统一封装高德地图 SDK。
 * - 小程序 / APP / H5 通过 <map> 原生组件渲染(高德 SDK key 在 manifest.json 中配置)
 * - 输出统一 props/events,业务侧无需关心平台差异
 */
import { onMounted, ref, watch } from 'vue';

interface MapMarker {
  id: number;
  latitude: number;
  longitude: number;
  title?: string;
  iconPath?: string;
  width?: number;
  height?: number;
}

const props = withDefaults(
  defineProps<{
    latitude: number;
    longitude: number;
    scale?: number;
    showLocation?: boolean;
    markers?: MapMarker[];
    height?: string;
  }>(),
  {
    scale: 14,
    showLocation: true,
    markers: () => [],
    height: '480rpx',
  },
);

const emit = defineEmits<{
  regionChange: [payload: { latitude: number; longitude: number }];
  markerTap: [markerId: number];
  ready: [];
}>();

const mapId = ref(`o2o-map-${Math.random().toString(36).slice(2, 8)}`);

function onRegionChange(e: { detail?: { centerLocation?: { latitude: number; longitude: number } } }): void {
  const c = e.detail?.centerLocation;
  if (c) emit('regionChange', { latitude: c.latitude, longitude: c.longitude });
}

function onMarkerTap(e: { detail?: { markerId: number }; markerId?: number }): void {
  const id = e.detail?.markerId ?? e.markerId;
  if (typeof id === 'number') emit('markerTap', id);
}

onMounted(() => {
  emit('ready');
});

watch(
  () => [props.latitude, props.longitude],
  () => {
    /* 父组件可通过双向 prop 控制中心点 */
  },
);
</script>

<template>
  <view class="map-view" :style="{ height }">
    <map
      :id="mapId"
      class="map-view__inner"
      :latitude="latitude"
      :longitude="longitude"
      :scale="scale"
      :show-location="showLocation"
      :markers="markers"
      @regionchange="onRegionChange"
      @markertap="onMarkerTap"
    />
  </view>
</template>

<style scoped>
.map-view {
  width: 100%;
  position: relative;
}
.map-view__inner {
  width: 100%;
  height: 100%;
}
</style>
