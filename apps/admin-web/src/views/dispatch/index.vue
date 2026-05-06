<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

import { type AdminDispatchItemVo, listDispatchTasks } from '@/api/admin-dispatch';

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

function fmtTime(ms: number | null): string {
  return ms ? new Date(ms).toLocaleString() : '-';
}

function viewDetail(id: string): void {
  drawerId.value = id;
  drawerVisible.value = true;
}

onMounted(load);
</script>

<template>
  <el-card>
    <template #header>
      <div class="header">
        <span>调度监控</span>
        <el-form :model="query" :inline="true" size="small">
          <el-form-item label="状态">
            <el-select v-model="query.status" style="width: 140px">
              <el-option v-for="o in STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="业务">
            <el-select v-model="query.bizType" style="width: 120px">
              <el-option v-for="o in BIZ_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
        </el-form>
      </div>
    </template>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="dispatchTaskId" label="ID" width="100" />
      <el-table-column prop="bizType" label="业务" width="80" />
      <el-table-column prop="bizOrderId" label="订单 ID" width="140" />
      <el-table-column prop="acceptedRiderId" label="接单骑手" width="120" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">{{ STATUS_LABEL[row.status] || row.status }}</template>
      </el-table-column>
      <el-table-column prop="retryCount" label="重试次数" width="100" />
      <el-table-column label="派单时间" width="180">
        <template #default="{ row }">{{ fmtTime(row.dispatchedAt) }}</template>
      </el-table-column>
      <el-table-column label="超时时间" width="180">
        <template #default="{ row }">{{ fmtTime(row.timeoutAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewDetail(row.dispatchTaskId)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="query.pageNo"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="load"
        @size-change="load"
      />
    </div>

    <DispatchTaskDrawer v-model:visible="drawerVisible" :dispatch-task-id="drawerId" />
  </el-card>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
