<script setup lang="ts">
import { reactive, ref } from 'vue';

import { getTrackReplay, type TrackPointVo } from '@/api/admin-track-replay';

const points = ref<TrackPointVo[]>([]);
const count = ref(0);
const loading = ref(false);

const query = reactive({ riderTaskId: '', riderId: '', from: '', to: '' });

async function load(): Promise<void> {
  if (!query.riderTaskId && !(query.riderId && query.from)) {
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
    }
  } finally {
    loading.value = false;
  }
}

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleString();
}
</script>

<template>
  <el-card>
    <template #header>
      <div class="header">
        <span>轨迹回放</span>
        <el-form :model="query" :inline="true" size="small">
          <el-form-item label="任务 ID"><el-input v-model="query.riderTaskId" style="width: 140px" /></el-form-item>
          <el-form-item label="骑手 ID"><el-input v-model="query.riderId" style="width: 140px" /></el-form-item>
          <el-form-item label="起始 ms"><el-input v-model="query.from" style="width: 160px" /></el-form-item>
          <el-form-item label="结束 ms"><el-input v-model="query.to" style="width: 160px" /></el-form-item>
          <el-button type="primary" @click="load">查询</el-button>
        </el-form>
      </div>
    </template>
    <div class="hint">点位数:{{ count }} / 真 amap 路线展示在 stage 11 接入</div>
    <el-table v-loading="loading" :data="points" stripe max-height="500">
      <el-table-column type="index" width="60" />
      <el-table-column prop="lng" label="经度" width="120" />
      <el-table-column prop="lat" label="纬度" width="120" />
      <el-table-column label="时间">
        <template #default="{ row }">{{ fmtTime(row.recordedAt) }}</template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.hint {
  color: #888;
  margin-bottom: 8px;
}
</style>
