<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { onMounted, ref } from 'vue';

import { type SystemConfigItemVo, listSystemConfig, patchSystemConfig } from '@/api/admin-system-config';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const canManage = (): boolean => userStore.has('admin:system-config:manage');

const loading = ref(false);
const list = ref<SystemConfigItemVo[]>([]);
const editing = ref<Record<string, string>>({});

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const r = await listSystemConfig();
    if (r.code === '0' && r.data) {
      list.value = r.data.list;
      editing.value = {};
      for (const row of r.data.list) editing.value[row.configKey] = row.configValue;
    }
  } finally {
    loading.value = false;
  }
}

async function save(row: SystemConfigItemVo): Promise<void> {
  const v = editing.value[row.configKey] ?? '';
  if (v === row.configValue) {
    ElMessage.info('未修改');
    return;
  }
  const r = await patchSystemConfig(row.configKey, v);
  if (r.code === '0') {
    ElMessage.success('已保存');
    void fetchList();
  }
}

function fmtDate(ts: string): string {
  const n = Number(ts);
  if (!n) return '-';
  return new Date(n).toLocaleString();
}

onMounted(fetchList);
</script>

<template>
  <div class="system-config">
    <el-card>
      <template #header>
        <div class="header">
          <span>系统参数</span>
          <span v-if="!canManage()" class="readonly-tag">只读模式 — 缺 admin:system-config:manage 权限</span>
        </div>
      </template>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="configKey" prop="configKey" width="280" />
        <el-table-column label="value" min-width="220">
          <template #default="{ row }">
            <el-input v-if="canManage()" v-model="editing[row.configKey]" size="small" :placeholder="row.configValue" />
            <code v-else>{{ row.configValue }}</code>
          </template>
        </el-table-column>
        <el-table-column label="说明" prop="description" min-width="200" />
        <el-table-column label="updatedAt" width="180">
          <template #default="{ row }">{{ fmtDate(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column v-if="canManage()" label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="save(row)">保存</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.system-config {
  padding: 16px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.readonly-tag {
  color: #999;
  font-size: 12px;
}
</style>
