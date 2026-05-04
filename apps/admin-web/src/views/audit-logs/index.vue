<script setup lang="ts">
/** 操作日志页:接 GET /api/v1/admin/audit-logs */
import { onMounted, reactive, ref } from 'vue';

import { type AuditLogVo, queryAuditLogs } from '@/api';

const loading = ref(false);
const list = ref<AuditLogVo[]>([]);
const total = ref(0);
const query = reactive({
  operatorType: '',
  targetType: '',
  pageNo: 1,
  pageSize: 20,
});

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await queryAuditLogs({
      operatorType: query.operatorType || undefined,
      targetType: query.targetType || undefined,
      pageNo: query.pageNo,
      pageSize: query.pageSize,
    });
    if (res.code === '0' && res.data) {
      list.value = res.data.list;
      total.value = res.data.total;
    }
  } finally {
    loading.value = false;
  }
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

onMounted(load);
</script>

<template>
  <el-card>
    <template #header>
      <div class="flex items-center justify-between">
        <span>操作日志</span>
        <el-button v-permission="'admin:audit:logs:view'" type="primary" size="small" @click="load"> 刷新 </el-button>
      </div>
    </template>

    <el-form :inline="true" class="mb-4">
      <el-form-item label="主体类型">
        <el-select v-model="query.operatorType" clearable placeholder="全部" style="width: 160px">
          <el-option label="customer" value="customer" />
          <el-option label="merchant" value="merchant" />
          <el-option label="rider" value="rider" />
          <el-option label="admin" value="admin" />
          <el-option label="system" value="system" />
          <el-option label="public" value="public" />
        </el-select>
      </el-form-item>
      <el-form-item label="目标类型">
        <el-input v-model="query.targetType" clearable placeholder="如 file" style="width: 160px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="((query.pageNo = 1), load())">查询</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="list" v-loading="loading" border stripe size="small">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="traceId" label="TraceId" width="240" />
      <el-table-column prop="operatorType" label="主体" width="100" />
      <el-table-column prop="operatorId" label="主体ID" width="120" />
      <el-table-column prop="targetType" label="目标" width="120" />
      <el-table-column prop="targetId" label="目标ID" width="180" />
      <el-table-column prop="summary" label="摘要" />
      <el-table-column label="时间" width="180">
        <template #default="{ row }">{{ fmtTime(row.createdAt) }}</template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="mt-4"
      v-model:current-page="query.pageNo"
      v-model:page-size="query.pageSize"
      :total="total"
      :page-sizes="[10, 20, 50, 100]"
      layout="total, sizes, prev, pager, next"
      @current-change="load"
      @size-change="load"
    />
  </el-card>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 16px;
}
.mt-4 {
  margin-top: 16px;
}
</style>
