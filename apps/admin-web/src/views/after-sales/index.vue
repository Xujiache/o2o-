<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

import { type AdminAfterSaleListItemVo, listAfterSales } from '@/api/admin-after-sales';

import DataTable from '@/components/DataTable.vue';
import FilterBar from '@/components/FilterBar.vue';
import PageContainer from '@/components/PageContainer.vue';
import StatusTag from '@/components/StatusTag.vue';
import { formatDateTime, formatYuan } from '@/utils/format';

import AfterSaleDetailDrawer from './components/AfterSaleDetailDrawer.vue';

const loading = ref(false);
const list = ref<AdminAfterSaleListItemVo[]>([]);
const total = ref(0);
const drawerVisible = ref(false);
const drawerId = ref<string | null>(null);

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '待商家审核', value: 'PENDING_MERCHANT' },
  { label: '商家已通过', value: 'APPROVED_BY_MERCHANT' },
  { label: '商家已驳回', value: 'REJECTED_BY_MERCHANT' },
  { label: '平台仲裁中', value: 'PENDING_PLATFORM' },
  { label: '已完成', value: 'COMPLETED' },
];

const STATUS_LABEL: Record<string, string> = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));

const query = reactive({ status: '', storeId: '', pageNo: 1, pageSize: 20 });

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await listAfterSales({
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
  void load();
}

function onReset(): void {
  query.status = '';
  query.storeId = '';
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
  <PageContainer title="售后订单" subtitle="退款/仲裁工单流水">
    <template #extra>
      <el-button @click="load">
        <el-icon><Refresh /></el-icon>
        <span style="margin-left: 6px">刷新</span>
      </el-button>
    </template>

    <FilterBar @search="onSearch" @reset="onReset">
      <div class="filter-field">
        <label>状态</label>
        <el-select v-model="query.status" style="width: 180px">
          <el-option v-for="o in STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </div>
      <div class="filter-field">
        <label>店铺</label>
        <el-input
          v-model="query.storeId"
          placeholder="storeId"
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
      @page-change="load"
    >
      <el-table-column label="售后 ID" prop="afterSaleId" width="120">
        <template #default="{ row }"
          ><span class="mono">{{ row.afterSaleId }}</span></template
        >
      </el-table-column>
      <el-table-column label="订单 ID" prop="orderId" width="140">
        <template #default="{ row }"
          ><span class="mono">{{ row.orderId }}</span></template
        >
      </el-table-column>
      <el-table-column label="店铺" prop="storeId" width="120">
        <template #default="{ row }"
          ><span class="mono">{{ row.storeId }}</span></template
        >
      </el-table-column>
      <el-table-column label="类型" prop="type" width="80" />
      <el-table-column label="原因" prop="reason" min-width="180" show-overflow-tooltip />
      <el-table-column label="金额（元）" align="right" width="110">
        <template #default="{ row }"
          ><span class="mono">{{ formatYuan(row.amountCents) }}</span></template
        >
      </el-table-column>
      <el-table-column label="状态" width="140">
        <template #default="{ row }">
          <StatusTag :status="row.status" :label="STATUS_LABEL[row.status] || row.status" />
        </template>
      </el-table-column>
      <el-table-column label="申请时间" width="180">
        <template #default="{ row }"
          ><span class="muted">{{ formatDateTime(row.appliedAt) }}</span></template
        >
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewDetail(row.afterSaleId)">详情</el-button>
        </template>
      </el-table-column>
    </DataTable>

    <AfterSaleDetailDrawer v-model:visible="drawerVisible" :after-sale-id="drawerId" @refresh="load" />
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
