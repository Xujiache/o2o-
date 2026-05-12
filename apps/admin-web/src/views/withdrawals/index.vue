<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

import { type AdminWithdrawalListItemVo, listWithdrawals } from '@/api/admin-withdrawals';
import DataTable from '@/components/DataTable.vue';
import FilterBar from '@/components/FilterBar.vue';
import PageContainer from '@/components/PageContainer.vue';
import StatusTag from '@/components/StatusTag.vue';
import { formatDateTime, formatYuan } from '@/utils/format';

import WithdrawalDetailDrawer from './components/WithdrawalDetailDrawer.vue';

const loading = ref(false);
const list = ref<AdminWithdrawalListItemVo[]>([]);
const total = ref(0);
const drawerVisible = ref(false);
const drawerId = ref<string | null>(null);

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '审核中', value: 'PENDING' },
  { label: '处理中', value: 'APPROVED' },
  { label: '已到账', value: 'COMPLETED' },
  { label: '已驳回', value: 'REJECTED' },
  { label: '失败', value: 'FAILED' },
];

const STATUS_LABEL: Record<string, string> = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));

const query = reactive({ status: '', storeId: '', pageNo: 1, pageSize: 20 });

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const r = await listWithdrawals({
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
  <PageContainer title="提现单监控" subtitle="商家提现单审批与打款追踪">
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
      <el-table-column label="提现单号" prop="withdrawalNo" width="200">
        <template #default="{ row }"
          ><span class="mono">{{ row.withdrawalNo }}</span></template
        >
      </el-table-column>
      <el-table-column label="店铺" prop="storeId" width="120">
        <template #default="{ row }"
          ><span class="mono">{{ row.storeId }}</span></template
        >
      </el-table-column>
      <el-table-column label="商家" prop="merchantId" width="120">
        <template #default="{ row }"
          ><span class="mono">{{ row.merchantId }}</span></template
        >
      </el-table-column>
      <el-table-column label="金额（元）" align="right" width="130">
        <template #default="{ row }"
          ><span class="mono">{{ formatYuan(row.amountCents) }}</span></template
        >
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <StatusTag :status="row.status" :label="STATUS_LABEL[row.status] ?? row.status" />
        </template>
      </el-table-column>
      <el-table-column label="提交时间" width="180">
        <template #default="{ row }"
          ><span class="muted">{{ formatDateTime(row.submittedAt) }}</span></template
        >
      </el-table-column>
      <el-table-column label="完成时间" width="180">
        <template #default="{ row }"
          ><span class="muted">{{ formatDateTime(row.completedAt) }}</span></template
        >
      </el-table-column>
      <el-table-column label="失败原因" prop="failReason" />
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewDetail(row.withdrawalId)">详情</el-button>
        </template>
      </el-table-column>
    </DataTable>

    <WithdrawalDetailDrawer v-model:visible="drawerVisible" :withdrawal-id="drawerId" />
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
