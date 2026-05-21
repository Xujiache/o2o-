<script setup lang="ts">
import { ElMessage } from 'element-plus';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

import { getTrackReplay, type TrackPointVo } from '@/api/admin-track-replay';

import DataTable from '@/components/DataTable.vue';
import EmptyState from '@/components/EmptyState.vue';
import FilterBar from '@/components/FilterBar.vue';
import PageContainer from '@/components/PageContainer.vue';
import StatCard from '@/components/StatCard.vue';
import { formatDateTime } from '@/utils/format';

const points = ref<TrackPointVo[]>([]);
const count = ref(0);
const loading = ref(false);

const query = reactive({ riderTaskId: '', riderId: '', from: '', to: '' });

const mapEl = ref<HTMLDivElement | null>(null);
let map: L.Map | null = null;
let polyline: L.Polyline | null = null;
let startMarker: L.CircleMarker | null = null;
let endMarker: L.CircleMarker | null = null;

const totalDistanceMeters = computed<number>(() => {
  if (points.value.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < points.value.length; i += 1) {
    const prev = points.value[i - 1];
    const current = points.value[i];
    if (prev && current) sum += haversine(prev, current);
  }
  return sum;
});

const durationText = computed<string>(() => {
  if (points.value.length < 2) return '--';
  const first = points.value[0]!;
  const last = points.value[points.value.length - 1]!;
  const ms = Number(last.recordedAt) - Number(first.recordedAt);
  if (!Number.isFinite(ms) || ms <= 0) return '--';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec} 秒`;
  if (sec < 3600) return `${Math.floor(sec / 60)} 分 ${sec % 60} 秒`;
  return `${Math.floor(sec / 3600)} 小时 ${Math.floor((sec % 3600) / 60)} 分`;
});

const timeRangeText = computed<string>(() => {
  if (!points.value.length) return '--';
  const first = points.value[0]!;
  const last = points.value[points.value.length - 1]!;
  return `${formatDateTime(first.recordedAt)} - ${formatDateTime(last.recordedAt)}`;
});

function pointLng(point: TrackPointVo): number {
  return Number(point.lng);
}

function pointLat(point: TrackPointVo): number {
  return Number(point.lat);
}

function haversine(a: TrackPointVo, b: TrackPointVo): number {
  const lngA = pointLng(a);
  const latA = pointLat(a);
  const lngB = pointLng(b);
  const latB = pointLat(b);
  if (![lngA, latA, lngB, latB].every(Number.isFinite)) return 0;
  const radius = 6_371_000;
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(latB - latA);
  const dLng = toRad(lngB - lngA);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(s));
}

function fmtDistance(meters: number): string {
  if (meters === 0) return '--';
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(2)} km`;
}

async function load(): Promise<void> {
  if (!query.riderTaskId && !(query.riderId && query.from)) {
    ElMessage.warning('请填写任务 ID，或填写骑手 ID 与开始时间');
    return;
  }
  loading.value = true;
  try {
    const r = await getTrackReplay({
      riderTaskId: query.riderTaskId || undefined,
      riderId: query.riderId || undefined,
      from: query.from ? Number(query.from) : undefined,
      to: query.to ? Number(query.to) : undefined,
    });
    if (r.code === '0' && r.data) {
      points.value = r.data.points;
      count.value = r.data.count;
    } else {
      points.value = [];
      count.value = 0;
    }
  } finally {
    loading.value = false;
  }
}

function onReset(): void {
  query.riderTaskId = '';
  query.riderId = '';
  query.from = '';
  query.to = '';
  points.value = [];
  count.value = 0;
}

function fmtTime(ms: number): string {
  return formatDateTime(ms);
}

function initMap(): void {
  if (!mapEl.value || map) return;
  map = L.map(mapEl.value, { zoomControl: true, attributionControl: false }).setView([39.90923, 116.397428], 11);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: ['a', 'b', 'c', 'd'],
    attribution: 'OpenStreetMap / CartoDB',
  }).addTo(map);
  L.control.attribution({ prefix: false, position: 'bottomright' }).addAttribution('OSM').addTo(map);
}

function renderPolyline(): void {
  if (!map) return;
  if (polyline) {
    polyline.remove();
    polyline = null;
  }
  if (startMarker) {
    startMarker.remove();
    startMarker = null;
  }
  if (endMarker) {
    endMarker.remove();
    endMarker = null;
  }
  if (points.value.length === 0) return;

  const latlngs: L.LatLngExpression[] = points.value
    .map((p) => [pointLat(p), pointLng(p)] as [number, number])
    .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
  if (!latlngs.length) return;

  polyline = L.polyline(latlngs, {
    color: '#2e9c5d',
    weight: 4,
    opacity: 0.9,
    lineCap: 'round',
    lineJoin: 'round',
  }).addTo(map);

  const first = points.value[0]!;
  const last = points.value[points.value.length - 1]!;
  startMarker = L.circleMarker([pointLat(first), pointLng(first)], {
    radius: 7,
    color: '#22c55e',
    weight: 3,
    fillColor: '#22c55e',
    fillOpacity: 0.4,
  })
    .bindTooltip(`起点 ${fmtTime(first.recordedAt)}`, { permanent: false })
    .addTo(map);

  if (points.value.length > 1) {
    endMarker = L.circleMarker([pointLat(last), pointLng(last)], {
      radius: 7,
      color: '#ef4444',
      weight: 3,
      fillColor: '#ef4444',
      fillOpacity: 0.4,
    })
      .bindTooltip(`终点 ${fmtTime(last.recordedAt)}`, { permanent: false })
      .addTo(map);
  }
  map.fitBounds(polyline.getBounds(), { padding: [24, 24] });
}

watch(points, () => renderPolyline());

onMounted(() => {
  initMap();
});

onBeforeUnmount(() => {
  if (polyline) polyline.remove();
  if (startMarker) startMarker.remove();
  if (endMarker) endMarker.remove();
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<template>
  <PageContainer title="轨迹回放" subtitle="骑手 GPS 点位轨迹、折线和起止标记">
    <FilterBar @search="load" @reset="onReset">
      <div class="filter-field">
        <label>任务 ID</label>
        <el-input
          v-model="query.riderTaskId"
          placeholder="riderTaskId"
          clearable
          style="width: 200px"
          @keyup.enter="load"
        />
      </div>
      <div class="filter-field">
        <label>骑手 ID</label>
        <el-input v-model="query.riderId" placeholder="riderId" clearable style="width: 160px" @keyup.enter="load" />
      </div>
      <div class="filter-field">
        <label>开始时间</label>
        <el-date-picker
          v-model="query.from"
          type="datetime"
          value-format="x"
          placeholder="选择开始时间"
          style="width: 190px"
        />
      </div>
      <div class="filter-field">
        <label>结束时间</label>
        <el-date-picker
          v-model="query.to"
          type="datetime"
          value-format="x"
          placeholder="选择结束时间"
          style="width: 190px"
        />
      </div>
    </FilterBar>

    <section class="kpi-row">
      <StatCard label="点位数" :value="count" tone="brand" />
      <StatCard label="累计距离" :value="fmtDistance(totalDistanceMeters)" tone="info" />
      <StatCard label="时长" :value="durationText" tone="success" />
      <StatCard label="起止时间" :value="timeRangeText" tone="neutral" />
    </section>

    <section class="map-block card-surface">
      <div ref="mapEl" class="map" />
      <EmptyState
        v-if="!loading && points.length === 0"
        class="map-empty"
        title="暂无轨迹"
        description="输入任务 ID，或骑手 ID 与开始时间后查询"
        icon="Position"
      />
    </section>

    <DataTable :data="points" :loading="loading" empty-text="暂无点位">
      <el-table-column type="index" width="60" align="center" />
      <el-table-column label="经度" width="160">
        <template #default="{ row }"
          ><span class="mono">{{ row.lng }}</span></template
        >
      </el-table-column>
      <el-table-column label="纬度" width="160">
        <template #default="{ row }"
          ><span class="mono">{{ row.lat }}</span></template
        >
      </el-table-column>
      <el-table-column label="时间">
        <template #default="{ row }"
          ><span class="muted">{{ fmtTime(row.recordedAt) }}</span></template
        >
      </el-table-column>
    </DataTable>
  </PageContainer>
</template>

<style scoped>
.kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--gap-3);
}

.map-block {
  position: relative;
  padding: 0;
  overflow: hidden;
}

.map {
  height: 420px;
  width: 100%;
  background: var(--bg-sunken);
}

.map-empty {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.8);
}

.mono {
  font-family: var(--font-mono);
  font-size: 12px;
}

.muted {
  color: var(--fg-muted);
  font-size: 12px;
}

:global(.leaflet-control-attribution) {
  background: rgba(255, 255, 255, 0.8) !important;
  color: var(--fg-muted) !important;
  font-size: 10px !important;
  border: 1px solid var(--border-default);
  border-radius: 4px;
  backdrop-filter: blur(6px);
}

:global(.leaflet-control-attribution a) {
  color: var(--brand-500) !important;
}
</style>
