<script setup lang="ts">
// TODO(WS): 订阅 admin:dispatch 替换轮询。W3 已建 ws-gateway
import { onMounted, reactive, ref } from 'vue';

import { type AdminDispatchItemVo, listDispatchTasks } from '@/api/admin-dispatch';

import DataTable from '@/components/DataTable.vue';
import FilterBar from '@/components/FilterBar.vue';
import PageContainer from '@/components/PageContainer.vue';
import StatusTag from '@/components/StatusTag.vue';
import { formatDateTime } from '@/utils/format';

import DispatchTaskDrawer from './components/DispatchTaskDrawer.vue';

const loading = ref(false);
const list = ref<AdminDispatchItemVo[]>([]);
const total = ref(0);
const drawerVisible = ref(false);
const drawerId = ref<string | null>(null);

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '派单中', value: 'PENDING' },
  { label: '已分配', value: 'DISPATCHED' },
  { label: '超时', value: 'TIMEOUT' },
  { label: '已取消', value: 'CANCELLED' },
];

const BIZ_OPTIONS = [
  { label: '全部', value: '' },
  { label: '外卖', value: 'FOOD' },
  { label: '跑腿', value: 'ERRAND' },
];

const STATUS_LABEL: Record<string, string> = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));
const BIZ_LABEL: Record<string, string> = Object.fromEntries(BIZ_OPTIONS.map((o) => [o.value, o.label]));

const query = reactive({ status: '', bizType: '', pageNo: 1, pageSize: 20 });

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await listDispatchTasks({
      status: query.status || undefined,
      bizType: query.bizType || undefined,
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
  void load();
}

function onReset(): void {
  query.status = '';
  query.bizType = '';
  query.pageNo = 1;
  void load();
}

function viewDetail(id: string): void {
  drawerId.value = id;
  drawerVisible.value = true;
}

onMounted(load);
</script>

<template>
  <PageContainer title="调度监控" subtitle="智能派单、人工改派与超时重试">
    <template #extra>
      <el-button @click="load">
        <el-icon><Refresh /></el-icon>
        <span style="margin-left: 6px">刷新</span>
      </el-button>
    </template>

    <FilterBar @search="onSearch" @reset="onReset">
      <div class="filter-field">
        <label>状态</label>
        <el-select v-model="query.status" style="width: 160px">
          <el-option v-for="o in STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </div>
      <div class="filter-field">
        <label>业务</label>
        <el-select v-model="query.bizType" style="width: 140px">
          <el-option v-for="o in BIZ_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </div>
    </FilterBar>

    <DataTable
      v-model:pageNo="query.pageNo"
      v-model:pageSize="query.pageSize"
      :data="list"
      :loading="loading"
      :total="total"
      @page-change="load"
    >
      <el-table-column label="任务 ID" prop="dispatchTaskId" width="120">
        <template #default="{ row }"
          ><span class="mono">{{ row.dispatchTaskId }}</span></template
        >
      </el-table-column>
      <el-table-column label="业务" width="90">
        <template #default="{ row }">
          <StatusTag
            :status="row.bizType"
            :label="BIZ_LABEL[row.bizType] ?? row.bizType"
            :tone="row.bizType === 'FOOD' ? 'brand' : 'info'"
          />
        </template>
      </el-table-column>
      <el-table-column label="订单 ID" prop="bizOrderId" width="160">
        <template #default="{ row }"
          ><span class="mono">{{ row.bizOrderId }}</span></template
        >
      </el-table-column>
      <el-table-column label="接单骑手" prop="acceptedRiderId" width="140">
        <template #default="{ row }">
          <span v-if="row.acceptedRiderId" class="mono">{{ row.acceptedRiderId }}</span>
          <span v-else class="muted">--</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <StatusTag :status="row.status" :label="STATUS_LABEL[row.status] || row.status" />
        </template>
      </el-table-column>
      <el-table-column label="重试次数" prop="retryCount" align="center" width="100">
        <template #default="{ row }"
          ><span class="mono">{{ row.retryCount }}</span></template
        >
      </el-table-column>
      <el-table-column label="派单时间" width="180">
        <template #default="{ row }"
          ><span class="muted">{{ formatDateTime(row.dispatchedAt) }}</span></template
        >
      </el-table-column>
      <el-table-column label="超时时间" width="180">
        <template #default="{ row }"
          ><span class="muted">{{ formatDateTime(row.timeoutAt) }}</span></template
        >
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewDetail(row.dispatchTaskId)">详情</el-button>
        </template>
      </el-table-column>
    </DataTable>

    <DispatchTaskDrawer v-model:visible="drawerVisible" :dispatch-task-id="drawerId" />
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
