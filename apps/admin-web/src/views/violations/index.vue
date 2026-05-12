<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

import { type AdminViolationItemVo, listViolations } from '@/api/admin-violations';
import DataTable from '@/components/DataTable.vue';
import FilterBar from '@/components/FilterBar.vue';
import PageContainer from '@/components/PageContainer.vue';
import StatusTag from '@/components/StatusTag.vue';
import { formatDateTime, formatYuan } from '@/utils/format';

const list = ref<AdminViolationItemVo[]>([]);
const total = ref(0);
const loading = ref(false);

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '已上报', value: 'REPORTED' },
  { label: '平台仲裁中', value: 'PENDING_PLATFORM' },
  { label: '已确认', value: 'CONFIRMED' },
  { label: '已撤销', value: 'DROPPED' },
];

const TYPE_OPTIONS = [
  { label: '全部', value: '' },
  { label: '异常', value: 'EXCEPTION' },
  { label: '超时', value: 'LATE' },
  { label: '投诉', value: 'COMPLAINT' },
  { label: '欺诈', value: 'FRAUD' },
];

const STATUS_LABEL: Record<string, string> = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));
const TYPE_LABEL: Record<string, string> = Object.fromEntries(TYPE_OPTIONS.map((o) => [o.value, o.label]));

const query = reactive({ status: '', type: '', riderId: '', pageNo: 1, pageSize: 20 });

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const r = await listViolations({
      status: query.status || undefined,
      type: query.type || undefined,
      riderId: query.riderId || undefined,
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
  query.type = '';
  query.riderId = '';
  query.pageNo = 1;
  void fetchList();
}

onMounted(fetchList);
</script>

<template>
  <PageContainer title="骑手违规记录" subtitle="超时、投诉、欺诈等违规事件流水">
    <template #extra>
      <el-button @click="fetchList">
        <el-icon><Refresh /></el-icon>
        <span style="margin-left: 6px">刷新</span>
      </el-button>
    </template>

    <FilterBar @search="onSearch" @reset="onReset">
      <div class="filter-field">
        <label>状态</label>
        <el-select v-model="query.status" placeholder="全部" clearable style="width: 160px">
          <el-option v-for="o in STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </div>
      <div class="filter-field">
        <label>类型</label>
        <el-select v-model="query.type" placeholder="全部" clearable style="width: 140px">
          <el-option v-for="o in TYPE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </div>
      <div class="filter-field">
        <label>骑手 ID</label>
        <el-input
          v-model="query.riderId"
          placeholder="riderId"
          clearable
          style="width: 160px"
          @keyup.enter="onSearch"
        />
      </div>
    </FilterBar>

    <DataTable
      v-model:pageNo="query.pageNo"
      v-model:pageSize="query.pageSize"
      :data="list"
      :loading="loading"
      :total="total"
      @page-change="fetchList"
    >
      <el-table-column label="ID" prop="violationId" width="90">
        <template #default="{ row }"
          ><span class="mono">{{ row.violationId }}</span></template
        >
      </el-table-column>
      <el-table-column label="骑手" prop="riderId" width="120">
        <template #default="{ row }"
          ><span class="mono">{{ row.riderId }}</span></template
        >
      </el-table-column>
      <el-table-column label="类型" width="100">
        <template #default="{ row }"
          ><span class="muted">{{ TYPE_LABEL[row.type] ?? row.type }}</span></template
        >
      </el-table-column>
      <el-table-column label="描述" prop="description" />
      <el-table-column label="扣款（元）" align="right" width="110">
        <template #default="{ row }"
          ><span class="mono">{{ formatYuan(row.deductCents) }}</span></template
        >
      </el-table-column>
      <el-table-column label="状态" width="130">
        <template #default="{ row }">
          <StatusTag :status="row.status" :label="STATUS_LABEL[row.status] ?? row.status" />
        </template>
      </el-table-column>
      <el-table-column label="上报时间" width="180">
        <template #default="{ row }"
          ><span class="muted">{{ formatDateTime(row.reportedAt) }}</span></template
        >
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
