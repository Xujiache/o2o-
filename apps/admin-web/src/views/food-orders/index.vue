<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

import {
  type AdminFoodOrderListItem,
  FOOD_ORDER_STATUS_LABEL,
  FOOD_ORDER_STATUS_OPTIONS,
  type FoodOrderStatus,
  getTimelineStats,
  listFoodOrders,
  type TimelineStatsVo,
} from '@/api/admin-food-orders';

import DataTable from '@/components/DataTable.vue';
import FilterBar from '@/components/FilterBar.vue';
import PageContainer from '@/components/PageContainer.vue';
import StatCard from '@/components/StatCard.vue';
import StatusTag from '@/components/StatusTag.vue';

import FoodOrderDetailDrawer from './components/FoodOrderDetailDrawer.vue';

const loading = ref(false);
const list = ref<AdminFoodOrderListItem[]>([]);
const total = ref(0);
const stats = ref<TimelineStatsVo | null>(null);
const drawerVisible = ref(false);
const drawerOrderId = ref<string | null>(null);

const STATUS_OPTIONS = FOOD_ORDER_STATUS_OPTIONS;

const query = reactive<{
  status: FoodOrderStatus | '';
  cityCode: string;
  customerId: string;
  storeId: string;
  pageNo: number;
  pageSize: number;
}>({
  status: '',
  cityCode: '',
  customerId: '',
  storeId: '',
  pageNo: 1,
  pageSize: 20,
});

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const r = await listFoodOrders({
      status: query.status || undefined,
      cityCode: query.cityCode || undefined,
      customerId: query.customerId || undefined,
      storeId: query.storeId || undefined,
      pageNo: query.pageNo,
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
  const r = await getTimelineStats();
  if (r.code === '0' && r.data) stats.value = r.data;
}

function viewDetail(row: AdminFoodOrderListItem): void {
  drawerOrderId.value = row.orderId;
  drawerVisible.value = true;
}

function onSearch(): void {
  query.pageNo = 1;
  void fetchList();
}
function onReset(): void {
  query.status = '';
  query.cityCode = '';
  query.customerId = '';
  query.storeId = '';
  query.pageNo = 1;
  void fetchList();
}

const fmtDate = (ts: number): string => new Date(ts).toLocaleString();
const fmtYuan = (cents: string): string => `${(Number(cents || 0) / 100).toFixed(2)} 元`;
const statusLabel = (status: FoodOrderStatus): string => FOOD_ORDER_STATUS_LABEL[status] ?? status;

onMounted(() => {
  void fetchList();
  void fetchStats();
});
</script>

<template>
  <PageContainer title="外卖订单" subtitle="全量订单流水 · 含 timeline 超时统计">
    <template #extra>
      <el-button
        @click="
          fetchStats();
          fetchList();
        "
      >
        <el-icon><Refresh /></el-icon>
        <span style="margin-left: 6px">刷新</span>
      </el-button>
    </template>

    <!-- KPI -->
    <section class="kpi-row">
      <StatCard
        label="待支付超时"
        :value="stats?.waitPayOverdueCount ?? '—'"
        tone="warning"
        :loading="!stats"
        hint="expireAt < now"
      />
      <StatCard
        label="商家 10min 未接"
        :value="stats?.merchantAcceptOverdueCount ?? '—'"
        tone="danger"
        :loading="!stats"
        hint="自动取消触发线"
      />
      <StatCard label="配送中" :value="stats?.deliveringCount ?? '—'" tone="info" :loading="!stats" />
      <StatCard label="今日完成" :value="stats?.completedTodayCount ?? '—'" tone="success" :loading="!stats" />
      <StatCard label="今日取消" :value="stats?.cancelledTodayCount ?? '—'" tone="neutral" :loading="!stats" />
    </section>

    <!-- Filter -->
    <FilterBar @search="onSearch" @reset="onReset">
      <div class="filter-field">
        <label>状态</label>
        <el-select v-model="query.status" placeholder="全部" clearable style="width: 160px">
          <el-option v-for="o in STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </div>
      <div class="filter-field">
        <label>城市</label>
        <el-input
          v-model="query.cityCode"
          placeholder="cityCode"
          clearable
          style="width: 120px"
          @keyup.enter="onSearch"
        />
      </div>
      <div class="filter-field">
        <label>用户</label>
        <el-input
          v-model="query.customerId"
          placeholder="customerId"
          clearable
          style="width: 140px"
          @keyup.enter="onSearch"
        />
      </div>
      <div class="filter-field">
        <label>店铺</label>
        <el-input
          v-model="query.storeId"
          placeholder="storeId"
          clearable
          style="width: 140px"
          @keyup.enter="onSearch"
        />
      </div>
    </FilterBar>

    <!-- Table -->
    <DataTable
      :data="list"
      :loading="loading"
      :total="total"
      v-model:pageNo="query.pageNo"
      v-model:pageSize="query.pageSize"
      @page-change="fetchList"
    >
      <el-table-column label="订单号" prop="orderNo" width="200">
        <template #default="{ row }">
          <span class="mono">{{ row.orderNo }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="140">
        <template #default="{ row }">
          <StatusTag :status="row.status" :label="statusLabel(row.status)" />
        </template>
      </el-table-column>
      <el-table-column label="支付" prop="payStatus" width="100">
        <template #default="{ row }">
          <span class="muted">{{ row.payStatus }}</span>
        </template>
      </el-table-column>
      <el-table-column label="用户" prop="customerId" width="140">
        <template #default="{ row }"
          ><span class="mono">{{ row.customerId }}</span></template
        >
      </el-table-column>
      <el-table-column label="店铺" prop="storeId" width="120">
        <template #default="{ row }"
          ><span class="mono">{{ row.storeId }}</span></template
        >
      </el-table-column>
      <el-table-column label="城市" prop="cityCode" width="80" />
      <el-table-column label="应付" align="right" width="120">
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

    <FoodOrderDetailDrawer v-model:visible="drawerVisible" :order-id="drawerOrderId" />
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
