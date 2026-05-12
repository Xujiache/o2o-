<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

import {
  type AdminErrandOrderListItem,
  type AdminErrandStatsVo,
  type ErrandOrderStatus,
  type ErrandTypeCode,
  getErrandStats,
  listErrandOrders,
} from '@/api/admin-errand-orders';

import DataTable from '@/components/DataTable.vue';
import FilterBar from '@/components/FilterBar.vue';
import PageContainer from '@/components/PageContainer.vue';
import StatCard from '@/components/StatCard.vue';
import StatusTag from '@/components/StatusTag.vue';

import ErrandOrderDetailDrawer from './components/ErrandOrderDetailDrawer.vue';

const loading = ref(false);
const list = ref<AdminErrandOrderListItem[]>([]);
const total = ref(0);
const stats = ref<AdminErrandStatsVo | null>(null);
const drawerVisible = ref(false);
const drawerOrderId = ref<string | null>(null);

const STATUS_OPTIONS: Array<{ label: string; value: ErrandOrderStatus | '' }> = [
  { label: '全部', value: '' },
  { label: '待支付', value: 'WAIT_PAY' },
  { label: '已支付', value: 'PAID' },
  { label: '派单中', value: 'DISPATCHING' },
  { label: '已接单', value: 'ASSIGNED' },
  { label: '已送达', value: 'DELIVERED' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已取消', value: 'CANCELLED' },
];

const TYPE_OPTIONS: Array<{ label: string; value: ErrandTypeCode | '' }> = [
  { label: '全部', value: '' },
  { label: '帮我买', value: 'BUY' },
  { label: '帮我送', value: 'DELIVER' },
  { label: '帮我办', value: 'HELP' },
  { label: '自定义', value: 'CUSTOM' },
];

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.filter((o) => o.value).map((o) => [o.value as string, o.label]),
);

const URGENT_LABEL: Record<string, string> = {
  standard: '标准',
  fast: '加急',
  express: '特急',
};

const query = reactive<{
  status: ErrandOrderStatus | '';
  typeCode: ErrandTypeCode | '';
  customerId: string;
  pageNo: number;
  pageSize: number;
}>({
  status: '',
  typeCode: '',
  customerId: '',
  pageNo: 1,
  pageSize: 20,
});

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const r = await listErrandOrders({
      status: query.status || undefined,
      typeCode: query.typeCode || undefined,
      customerId: query.customerId || undefined,
      page: query.pageNo,
      pageSize: query.pageSize,
    });
    if (r.code === '0' && r.data) {
      list.value = r.data.list;
      total.value = r.data.total;
    }
  } finally {
    loading.value = false;
  }
}

async function fetchStats(): Promise<void> {
  const r = await getErrandStats();
  if (r.code === '0' && r.data) stats.value = r.data;
}

function viewDetail(row: AdminErrandOrderListItem): void {
  drawerOrderId.value = row.orderId;
  drawerVisible.value = true;
}

function onSearch(): void {
  query.pageNo = 1;
  void fetchList();
}

function onReset(): void {
  query.status = '';
  query.typeCode = '';
  query.customerId = '';
  query.pageNo = 1;
  void fetchList();
}

function onRefresh(): void {
  void fetchStats();
  void fetchList();
}

const fmtDate = (ts: number): string => new Date(ts).toLocaleString();
const fmtYuan = (cents: string): string => `${(Number(cents || 0) / 100).toFixed(2)} 元`;

onMounted(() => {
  void fetchList();
  void fetchStats();
});
</script>

<template>
  <PageContainer title="跑腿订单" subtitle="帮买 / 帮送 / 帮办 / 自定义 全量流水">
    <template #extra>
      <el-button @click="onRefresh">
        <el-icon><Refresh /></el-icon>
        <span style="margin-left: 6px">刷新</span>
      </el-button>
    </template>

    <section class="kpi-row">
      <StatCard label="总订单" :value="stats?.totalCount ?? '—'" tone="brand" :loading="!stats" />
      <StatCard label="待支付" :value="stats?.waitPayCount ?? '—'" tone="warning" :loading="!stats" />
      <StatCard label="已支付" :value="stats?.paidCount ?? '—'" tone="info" :loading="!stats" />
      <StatCard label="派单中" :value="stats?.dispatchingCount ?? '—'" tone="warning" :loading="!stats" />
      <StatCard label="骑手已接" :value="stats?.assignedCount ?? '—'" tone="info" :loading="!stats" />
      <StatCard label="已完成" :value="stats?.completedCount ?? '—'" tone="success" :loading="!stats" />
      <StatCard label="已取消" :value="stats?.cancelledCount ?? '—'" tone="neutral" :loading="!stats" />
      <StatCard
        label="总金额"
        :value="stats ? `${fmtYuan(stats.totalAmount)}` : '—'"
        tone="success"
        :loading="!stats"
      />
    </section>

    <FilterBar @search="onSearch" @reset="onReset">
      <div class="filter-field">
        <label>状态</label>
        <el-select v-model="query.status" placeholder="全部" clearable style="width: 160px">
          <el-option v-for="o in STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </div>
      <div class="filter-field">
        <label>类型</label>
        <el-select v-model="query.typeCode" placeholder="全部" clearable style="width: 140px">
          <el-option v-for="o in TYPE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </div>
      <div class="filter-field">
        <label>用户</label>
        <el-input
          v-model="query.customerId"
          placeholder="customerId"
          clearable
          style="width: 160px"
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
      <el-table-column label="订单号" prop="orderNo" width="180">
        <template #default="{ row }"
          ><span class="mono">{{ row.orderNo }}</span></template
        >
      </el-table-column>
      <el-table-column label="类型" prop="typeCode" width="80">
        <template #default="{ row }">
          <span class="muted">{{ row.typeCode }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="130">
        <template #default="{ row }">
          <StatusTag :status="row.status" :label="STATUS_LABEL[row.status] ?? row.status" />
        </template>
      </el-table-column>
      <el-table-column label="紧急度" prop="urgentLevel" width="90">
        <template #default="{ row }">
          <span class="muted">{{ URGENT_LABEL[row.urgentLevel] ?? row.urgentLevel }}</span>
        </template>
      </el-table-column>
      <el-table-column label="用户" prop="customerId" width="140">
        <template #default="{ row }"
          ><span class="mono">{{ row.customerId }}</span></template
        >
      </el-table-column>
      <el-table-column label="应付金额" align="right" width="120">
        <template #default="{ row }">
          <span class="mono">{{ fmtYuan(row.payableAmount) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">
          <span class="muted">{{ fmtDate(row.createdAt) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </DataTable>

    <ErrandOrderDetailDrawer v-model:visible="drawerVisible" :order-id="drawerOrderId" />
  </PageContainer>
</template>

<style scoped>
.kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--gap-3);
}
.mono {
  font-family: var(--font-mono);
  font-size: 12px;
}
.muted {
  color: var(--fg-muted);
  font-size: 12px;
}
</style>
