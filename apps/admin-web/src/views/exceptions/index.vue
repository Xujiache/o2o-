<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

import { listRiskExceptions, type RiskExceptionItemVo } from '@/api/admin-risk';
import DataTable from '@/components/DataTable.vue';
import FilterBar from '@/components/FilterBar.vue';
import PageContainer from '@/components/PageContainer.vue';
import StatusTag from '@/components/StatusTag.vue';

const loading = ref(false);
const list = ref<RiskExceptionItemVo[]>([]);
const total = ref(0);
const query = reactive({ status: '', exceptionType: '', pageNo: 1, pageSize: 20 });

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '待处理', value: 'OPEN' },
  { label: '已处理', value: 'HANDLED' },
  { label: '已忽略', value: 'IGNORED' },
];
const STATUS_LABEL: Record<string, string> = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));

const SEVERITY_TONE: Record<string, 'danger' | 'warning' | 'info' | 'neutral'> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'info',
};

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const r = await listRiskExceptions({
      status: query.status || undefined,
      exceptionType: query.exceptionType || undefined,
      pageNo: query.pageNo,
      pageSize: query.pageSize,
    });
    if (r.code === '0' && r.data) {
      list.value = r.data.items;
      total.value = r.data.total;
    }
  } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  query.pageNo = 1;
  void fetchList();
}

function onReset(): void {
  query.status = '';
  query.exceptionType = '';
  query.pageNo = 1;
  void fetchList();
}

onMounted(fetchList);
</script>

<template>
  <PageContainer title="异常订单监控" subtitle="风控引擎扫描产出的可疑订单">
    <template #extra>
      <el-button @click="fetchList">
        <el-icon><Refresh /></el-icon>
        <span style="margin-left: 6px">刷新</span>
      </el-button>
    </template>

    <FilterBar @search="onSearch" @reset="onReset">
      <div class="filter-field">
        <label>状态</label>
        <el-select v-model="query.status" placeholder="全部" clearable style="width: 140px">
          <el-option v-for="o in STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </div>
      <div class="filter-field">
        <label>异常类型</label>
        <el-input
          v-model="query.exceptionType"
          placeholder="exceptionType"
          clearable
          style="width: 180px"
          @keyup.enter="onSearch"
        />
      </div>
    </FilterBar>

    <DataTable
      :data="list"
      :loading="loading"
      :total="total"
      v-model:pageNo="query.pageNo"
      v-model:pageSize="query.pageSize"
      @page-change="fetchList"
    >
      <el-table-column label="ID" prop="logId" width="90">
        <template #default="{ row }"
          ><span class="mono">{{ row.logId }}</span></template
        >
      </el-table-column>
      <el-table-column label="类型" prop="exceptionType" width="200">
        <template #default="{ row }"
          ><span class="muted">{{ row.exceptionType }}</span></template
        >
      </el-table-column>
      <el-table-column label="业务" prop="bizType" width="90">
        <template #default="{ row }"
          ><span class="muted">{{ row.bizType }}</span></template
        >
      </el-table-column>
      <el-table-column label="订单 ID" prop="bizOrderId" width="160">
        <template #default="{ row }"
          ><span class="mono">{{ row.bizOrderId }}</span></template
        >
      </el-table-column>
      <el-table-column label="级别" width="90">
        <template #default="{ row }">
          <StatusTag :status="row.severity" :label="row.severity" :tone="SEVERITY_TONE[row.severity] ?? 'neutral'" />
        </template>
      </el-table-column>
      <el-table-column label="描述" prop="description" />
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <StatusTag :status="row.status" :label="STATUS_LABEL[row.status] ?? row.status" />
        </template>
      </el-table-column>
    </DataTable>
  </PageContainer>
</template>

<style scoped>
.mono {
  font-family: var(--font-mono);
  font-size: 12px;
}
.muted {
  color: var(--fg-muted);
  font-size: 12px;
}
</style>
