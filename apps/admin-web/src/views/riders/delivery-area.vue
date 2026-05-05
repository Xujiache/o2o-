<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, ref } from 'vue';

import { type GeoJsonPolygon, updateRiderServiceArea } from '@/api/admin-riders';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();

const riderId = ref('');
const geometryJson = ref(
  JSON.stringify(
    {
      type: 'Polygon',
      coordinates: [],
    },
    null,
    2,
  ),
);
const maxConcurrentOrders = ref(3);
const submitting = ref(false);

const parsedGeometry = computed<GeoJsonPolygon | null>(() => {
  try {
    const v = JSON.parse(geometryJson.value) as GeoJsonPolygon;
    if (v.type !== 'Polygon' || !Array.isArray(v.coordinates)) return null;
    return v;
  } catch {
    return null;
  }
});

async function onSubmit(): Promise<void> {
  if (!riderId.value.trim()) {
    ElMessage.warning('请输入骑手 ID');
    return;
  }
  if (!parsedGeometry.value) {
    ElMessage.error('GeoJSON 格式错误,需要 {type:"Polygon", coordinates: [...]}');
    return;
  }
  submitting.value = true;
  try {
    const r = await updateRiderServiceArea(riderId.value.trim(), {
      geometry: parsedGeometry.value,
      maxConcurrentOrders: maxConcurrentOrders.value,
    });
    if (r.code === '0') {
      ElMessage.success('已保存');
    } else {
      ElMessage.error(r.message || '保存失败');
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="rider-area">
    <el-card>
      <template #header>
        <span>骑手配送区域配置(GeoJSON Polygon · 本阶段 textarea 编辑;真拖拽留 stage 8)</span>
      </template>
      <el-form label-width="120px">
        <el-form-item label="骑手 ID" required>
          <el-input v-model="riderId" placeholder="approved 后的 rider_id" style="width: 240px" />
        </el-form-item>
        <el-form-item label="GeoJSON Polygon">
          <el-input
            v-model="geometryJson"
            type="textarea"
            :rows="10"
            placeholder='{"type":"Polygon","coordinates":[[[lng,lat],[lng,lat],[lng,lat],[lng,lat],[lng,lat]]]}'
          />
          <div class="rider-area__hint">
            首尾闭合,至少 4 点;空 coordinates [] 表示清空。
            <span v-if="!parsedGeometry" class="rider-area__error">JSON 格式错误</span>
          </div>
        </el-form-item>
        <el-form-item label="最大同时接单数">
          <el-input-number v-model="maxConcurrentOrders" :min="1" :max="20" />
        </el-form-item>
        <el-form-item>
          <el-button
            v-if="userStore.has('admin:riders:manage')"
            type="primary"
            :loading="submitting"
            :disabled="!parsedGeometry"
            @click="onSubmit"
            >保存</el-button
          >
          <el-tag v-else type="warning">无权限(需 admin:riders:manage)</el-tag>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.rider-area {
  padding: 16px;
}
.rider-area__hint {
  margin-top: 8px;
  font-size: 12px;
  color: #888;
}
.rider-area__error {
  color: #ff4d4f;
  margin-left: 8px;
}
</style>
