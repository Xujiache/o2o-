<script setup lang="ts">
import { ElMessage } from 'element-plus';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { type GeoJsonPolygon, updateRiderServiceArea } from '@/api/admin-riders';

import EmptyState from '@/components/EmptyState.vue';
import PageContainer from '@/components/PageContainer.vue';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const canManage = computed<boolean>(() => userStore.has('admin:riders:manage'));

const riderId = ref('');
const maxConcurrentOrders = ref(3);
const submitting = ref(false);

/** 真实数据来源：地图编辑器 → latlngs[] */
const latlngs = ref<Array<[number, number]>>([]); // [lng, lat] 顺序与 GeoJSON 一致

/** textarea 显示（与 latlngs 双向同步） */
const geometryJson = computed<string>(() => {
  if (latlngs.value.length === 0) {
    return JSON.stringify({ type: 'Polygon', coordinates: [] }, null, 2);
  }
  // GeoJSON Polygon 首尾必须闭合
  const ring = [...latlngs.value, latlngs.value[0]];
  return JSON.stringify({ type: 'Polygon', coordinates: [ring] }, null, 2);
});

const editableJson = ref(geometryJson.value);
const jsonError = ref<string | null>(null);

const pointCount = computed<number>(() => latlngs.value.length);
const isValidPolygon = computed<boolean>(() => latlngs.value.length === 0 || latlngs.value.length >= 3);

watch(geometryJson, (v) => {
  editableJson.value = v;
  jsonError.value = null;
});

/** 用户手动改 textarea → 反向解析 */
function onTextareaChange(): void {
  try {
    const v = JSON.parse(editableJson.value) as GeoJsonPolygon;
    if (v.type !== 'Polygon' || !Array.isArray(v.coordinates)) {
      jsonError.value = '需要 type=Polygon 且 coordinates 为数组';
      return;
    }
    if (v.coordinates.length === 0) {
      latlngs.value = [];
      jsonError.value = null;
      renderMap();
      return;
    }
    const ring = v.coordinates[0];
    if (!Array.isArray(ring) || ring.length < 4) {
      jsonError.value = '每环至少 4 个点(含首尾闭合)';
      return;
    }
    // 去掉闭合点
    const open = ring.slice(0, -1) as Array<[number, number]>;
    latlngs.value = open;
    jsonError.value = null;
    renderMap();
  } catch (err) {
    jsonError.value = err instanceof Error ? err.message : 'JSON 解析失败';
  }
}

// ===== Leaflet 地图 =====
const mapEl = ref<HTMLDivElement | null>(null);
let map: L.Map | null = null;
let polygonLayer: L.Polygon | null = null;
let previewLine: L.Polyline | null = null;
const markers: L.CircleMarker[] = [];

function initMap(): void {
  if (!mapEl.value || map) return;
  map = L.map(mapEl.value, { zoomControl: true, attributionControl: false }).setView([39.90923, 116.397428], 11);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: ['a', 'b', 'c', 'd'],
  }).addTo(map);
  L.control.attribution({ prefix: false, position: 'bottomright' }).addAttribution('OSM').addTo(map);

  map.on('click', (e: L.LeafletMouseEvent) => {
    if (!canManage.value) return;
    latlngs.value = [...latlngs.value, [e.latlng.lng, e.latlng.lat]];
    renderMap();
  });
}

function renderMap(): void {
  if (!map) return;
  // 清旧
  if (polygonLayer) {
    polygonLayer.remove();
    polygonLayer = null;
  }
  if (previewLine) {
    previewLine.remove();
    previewLine = null;
  }
  for (const m of markers) m.remove();
  markers.length = 0;

  if (latlngs.value.length === 0) return;

  // 点 marker
  latlngs.value.forEach(([lng, lat], i) => {
    const isFirst = i === 0;
    const m = L.circleMarker([lat, lng], {
      radius: 6,
      color: isFirst ? '#22c55e' : '#3b82f6',
      weight: 2,
      fillColor: isFirst ? '#22c55e' : '#3b82f6',
      fillOpacity: 0.6,
    })
      .bindTooltip(`#${i + 1} (${lng.toFixed(5)}, ${lat.toFixed(5)})`, { permanent: false })
      .addTo(map!);
    markers.push(m);
  });

  // ≥3 点 → polygon; 2 点 → polyline 预览
  if (latlngs.value.length >= 3) {
    const closed = [...latlngs.value.map(([lng, lat]) => [lat, lng] as L.LatLngTuple)];
    polygonLayer = L.polygon(closed, {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.9,
      fillColor: '#3b82f6',
      fillOpacity: 0.18,
    }).addTo(map);
    map.fitBounds(polygonLayer.getBounds(), { padding: [40, 40], maxZoom: 14 });
  } else if (latlngs.value.length === 2) {
    previewLine = L.polyline(
      latlngs.value.map(([lng, lat]) => [lat, lng] as L.LatLngTuple),
      { color: '#3b82f6', weight: 2, dashArray: '6 6' },
    ).addTo(map);
  }
}

function undo(): void {
  if (latlngs.value.length === 0) return;
  latlngs.value = latlngs.value.slice(0, -1);
  renderMap();
}

function clearAll(): void {
  latlngs.value = [];
  renderMap();
}

function locateBeijing(): void {
  map?.setView([39.90923, 116.397428], 11);
}

async function onSubmit(): Promise<void> {
  if (!riderId.value.trim()) {
    ElMessage.warning('请输入骑手 ID');
    return;
  }
  if (!isValidPolygon.value) {
    ElMessage.error('多边形至少需要 3 个点(将自动闭合)');
    return;
  }
  let geometry: GeoJsonPolygon;
  if (latlngs.value.length === 0) {
    geometry = { type: 'Polygon', coordinates: [] };
  } else {
    const first = latlngs.value[0]!;
    const ring = [...latlngs.value, first].map(([lng, lat]) => [lng, lat] as [number, number]);
    geometry = { type: 'Polygon', coordinates: [ring] };
  }

  submitting.value = true;
  try {
    const r = await updateRiderServiceArea(riderId.value.trim(), {
      geometry,
      maxConcurrentOrders: maxConcurrentOrders.value,
    });
    if (r.code === '0') {
      ElMessage.success(latlngs.value.length === 0 ? '已清空配送区域' : '已保存');
    } else {
      ElMessage.error(r.message || '保存失败');
    }
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  initMap();
});
onBeforeUnmount(() => {
  for (const m of markers) m.remove();
  if (polygonLayer) polygonLayer.remove();
  if (previewLine) previewLine.remove();
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<template>
  <PageContainer title="骑手配送区域" subtitle="地图点击添加点位 · 自动闭合多边形 · 双向 GeoJSON 编辑">
    <!-- 顶部表单 -->
    <section class="card-surface form-row">
      <div class="form-row__field">
        <label>骑手 ID</label>
        <el-input v-model="riderId" placeholder="approved 后的 rider_id" style="width: 220px" />
      </div>
      <div class="form-row__field">
        <label>最大同时接单</label>
        <el-input-number v-model="maxConcurrentOrders" :min="1" :max="20" />
      </div>
      <div class="form-row__field form-row__field--badge">
        <label>已添加点位</label>
        <span class="point-badge" :data-valid="isValidPolygon">{{ pointCount }}</span>
      </div>
      <div class="form-row__actions">
        <el-button :disabled="!pointCount" @click="undo">
          <el-icon><Back /></el-icon>
          <span style="margin-left: 4px">撤销</span>
        </el-button>
        <el-button :disabled="!pointCount" @click="clearAll">
          <el-icon><Delete /></el-icon>
          <span style="margin-left: 4px">清空</span>
        </el-button>
        <el-button @click="locateBeijing">
          <el-icon><LocationFilled /></el-icon>
          <span style="margin-left: 4px">回到北京</span>
        </el-button>
        <el-tag v-if="!canManage" type="warning">无权限 (需 admin:riders:manage)</el-tag>
        <el-button v-else type="primary" :loading="submitting" :disabled="!isValidPolygon" @click="onSubmit">
          保存配送区域
        </el-button>
      </div>
    </section>

    <!-- 地图 + JSON 双栏 -->
    <div class="grid">
      <div class="card-surface map-block">
        <div class="map-tip">
          <el-icon><Position /></el-icon>
          <span>点击地图添加点位，3 点起自动形成多边形</span>
        </div>
        <div ref="mapEl" class="map" />
        <EmptyState
          v-if="!pointCount"
          class="map-empty"
          title="未配置配送区域"
          description="点击地图任意位置即可开始绘制"
          icon="Position"
        />
      </div>
      <div class="card-surface json-block">
        <header class="block-head">
          <span>GeoJSON (与地图双向同步)</span>
          <span v-if="jsonError" class="json-error">{{ jsonError }}</span>
        </header>
        <el-input
          v-model="editableJson"
          type="textarea"
          :rows="14"
          spellcheck="false"
          class="json-textarea"
          @change="onTextareaChange"
        />
        <p class="hint">手动改后失焦自动同步到地图。空 coordinates [] 视为清空。</p>
      </div>
    </div>
  </PageContainer>
</template>

<style scoped>
.form-row {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: var(--gap-4);
  padding: var(--gap-4);
}
.form-row__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-row__field label {
  font-size: 11px;
  color: var(--fg-muted);
  letter-spacing: 0.4px;
  text-transform: uppercase;
}
.form-row__actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.point-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  min-width: 56px;
  padding: 0 12px;
  border-radius: 6px;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  background: var(--bg-elevated);
  color: var(--fg-secondary);
  border: 1px solid var(--border-default);
}
.point-badge[data-valid='true'] {
  color: var(--status-success);
  background: var(--status-success-soft);
  border-color: rgba(34, 197, 94, 0.32);
}

.grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: var(--gap-4);
}
@media (max-width: 1100px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.map-block {
  padding: 0;
  position: relative;
  overflow: hidden;
}
.map {
  height: 480px;
  width: 100%;
  background: var(--bg-sunken);
}
.map-tip {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 400;
  background: rgba(7, 10, 16, 0.78);
  border: 1px solid var(--border-default);
  color: var(--fg-secondary);
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  backdrop-filter: blur(6px);
}
.map-empty {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: rgba(7, 10, 16, 0.6);
}

.json-block {
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 10px;
}
.block-head {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--fg-secondary);
}
.json-error {
  color: var(--status-danger);
  font-size: 12px;
}
.json-textarea :deep(.el-textarea__inner) {
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  resize: vertical;
}
.hint {
  margin: 0;
  font-size: 12px;
  color: var(--fg-muted);
}

/* Leaflet 深色覆盖（已在 track-replay 全局生效，仅保证局部 z-index） */
:deep(.leaflet-container) {
  background: var(--bg-sunken);
}
</style>
