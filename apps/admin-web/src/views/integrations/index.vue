<script setup lang="ts">
/** 第三方配置页:接 GET /api/v1/admin/integrations/health + 预留配置编辑表单(空表) */
import { onMounted, ref } from 'vue';

import { getIntegrationsHealth, type IntegrationHealthVo } from '@/api';

const loading = ref(false);
const list = ref<IntegrationHealthVo[]>([]);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await getIntegrationsHealth();
    if (res.code === '0' && res.data) list.value = res.data;
  } finally {
    loading.value = false;
  }
}

function fmtTime(ts: number | null): string {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('zh-CN');
}

function tagType(status: string): 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'OK' || status === 'HEALTHY') return 'success';
  if (status === 'DEGRADED') return 'warning';
  if (status === 'DOWN' || status === 'ERROR') return 'danger';
  return 'info';
}

onMounted(load);
</script>

<template>
  <div class="flex flex-col gap-4">
    <el-card>
      <template #header>
        <div class="flex items-center justify-between">
          <span>第三方健康状态</span>
          <el-button type="primary" size="small" @click="load">刷新</el-button>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" border stripe size="small">
        <el-table-column prop="provider" label="Provider" width="160" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="tagType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="mode" label="模式" width="120" />
        <el-table-column label="最近检测" width="180">
          <template #default="{ row }">{{ fmtTime(row.lastCheckedAt) }}</template>
        </el-table-column>
        <el-table-column prop="errorMessage" label="错误信息" />
      </el-table>
    </el-card>

    <el-card>
      <template #header>配置编辑(预留)</template>
      <el-alert type="info" :closable="false" title="阶段 0 仅占位,完整配置编辑功能在阶段 4 / 9 实现。" />
      <el-form label-width="120px" class="mt-4" disabled>
        <el-form-item label="Provider">
          <el-input placeholder="如 amap / wxpay" />
        </el-form-item>
        <el-form-item label="App Key">
          <el-input placeholder="(占位)" />
        </el-form-item>
        <el-form-item label="App Secret">
          <el-input placeholder="(占位)" type="password" show-password />
        </el-form-item>
        <el-form-item label="模式">
          <el-radio-group>
            <el-radio value="mock">mock</el-radio>
            <el-radio value="real">real</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.mt-4 {
  margin-top: 16px;
}
.flex {
  display: flex;
}
.flex-col {
  flex-direction: column;
}
.gap-4 {
  gap: 16px;
}
</style>
