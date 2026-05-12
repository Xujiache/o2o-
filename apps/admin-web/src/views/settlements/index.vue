<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

import { type AdminSettlementListItemVo, listSettlements } from '@/api/admin-settlements';
import DataTable from '@/components/DataTable.vue';
import FilterBar from '@/components/FilterBar.vue';
import PageContainer from '@/components/PageContainer.vue';
import StatusTag from '@/components/StatusTag.vue';
import { formatDate, formatYuan } from '@/utils/format';

import SettlementDetailDrawer from './components/SettlementDetailDrawer.vue';

const loading = ref(false);
const list = ref<AdminSettlementListItemVo[]>([]);
const total = ref(0);
const drawerVisible = ref(false);
const drawerId = ref<string | null>(null);

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '待结算', value: 'PENDING' },
  { label: '可提现', value: 'READY' },
  { label: '已打款', value: 'PAID' },
  { label: '失败', value: 'FAILED' },
];

const STATUS_LABEL: Record<string, string> = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));

const query = reactive({ status: '', storeId: '', pageNo: 1, pageSize: 20 });

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const r = await listSettlements({
      status: query.status || undefined,
      storeId: query.storeId || undefined,
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
  query.storeId = '';
  query.pageNo = 1;
  void fetchList();
}

function viewDetail(id: string): void {
  drawerId.value = id;
  drawerVisible.value = true;
}

onMounted(fetchList);
</script>

<template>
  <PageContainer title="结算单监控" subtitle="店铺周期结算与佣金核对">
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
        <label>店铺 ID</label>
        <el-input
          v-model="query.storeId"
          placeholder="storeId"
          clearable
          style="width: 180px"
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
      <el-table-column label="结算单号" prop="settlementNo" width="200">
        <template #default="{ row }"
          ><span class="mono">{{ row.settlementNo }}</span></template
        >
      </el-table-column>
      <el-table-column label="店铺" prop="storeId" width="120">
        <template #default="{ row }"
          ><span class="mono">{{ row.storeId }}</span></template
        >
      </el-table-column>
      <el-table-column label="周期" width="220">
        <template #default="{ row }">
          <span class="muted">{{ formatDate(row.periodStart) }} ~ {{ formatDate(row.periodEnd) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="毛收入（元）" align="right">
        <template #default="{ row }"
          ><span class="mono">{{ formatYuan(row.grossCents) }}</span></template
        >
      </el-table-column>
      <el-table-column label="佣金（元）" align="right">
        <template #default="{ row }"
          ><span class="mono">{{ formatYuan(row.commissionCents) }}</span></template
        >
      </el-table-column>
      <el-table-column label="通道费（元）" align="right">
        <template #default="{ row }"
          ><span class="mono">{{ formatYuan(row.feeCents) }}</span></template
        >
      </el-table-column>
      <el-table-column label="实结（元）" align="right">
        <template #default="{ row }"
          ><span class="mono">{{ formatYuan(row.netCents) }}</span></template
        >
      </el-table-column>
      <el-table-column label="订单数" prop="orderCount" width="80" align="right">
        <template #default="{ row }"
          ><span class="mono">{{ row.orderCount }}</span></template
        >
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <StatusTag :status="row.status" :label="STATUS_LABEL[row.status] ?? row.status" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewDetail(row.settlementId)">详情</el-button>
        </template>
      </el-table-column>
    </DataTable>

    <SettlementDetailDrawer v-model:visible="drawerVisible" :settlement-id="drawerId" />
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
