<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

import { type AdminRefundItemVo, listRefunds } from '@/api/admin-refunds';
import DataTable from '@/components/DataTable.vue';
import FilterBar from '@/components/FilterBar.vue';
import PageContainer from '@/components/PageContainer.vue';
import StatusTag from '@/components/StatusTag.vue';

const loading = ref(false);
const list = ref<AdminRefundItemVo[]>([]);
const total = ref(0);
const query = reactive({ status: '', bizType: '', pageNo: 1, pageSize: 20 });

const STATUS_LABEL: Record<string, string> = {
  PENDING: '处理中',
  SUCCESS: '成功',
  FAILED: '失败',
};
const BIZ_LABEL: Record<string, string> = { FOOD: '外卖', ERRAND: '跑腿' };

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const r = await listRefunds({
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
  void fetchList();
}

function onReset(): void {
  query.status = '';
  query.bizType = '';
  query.pageNo = 1;
  void fetchList();
}

const fmtYuan = (cents: string | number): string => `${(Number(cents || 0) / 100).toFixed(2)} 元`;

onMounted(fetchList);
</script>

<template>
  <PageContainer title="退款执行" subtitle="支付通道退款执行流水">
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
          <el-option label="全部" value="" />
          <el-option label="处理中" value="PENDING" />
          <el-option label="成功" value="SUCCESS" />
          <el-option label="失败" value="FAILED" />
        </el-select>
      </div>
      <div class="filter-field">
        <label>业务</label>
        <el-select v-model="query.bizType" placeholder="全部" clearable style="width: 120px">
          <el-option label="全部" value="" />
          <el-option label="外卖" value="FOOD" />
          <el-option label="跑腿" value="ERRAND" />
        </el-select>
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
      <el-table-column label="退款单号" prop="refundNo" width="200">
        <template #default="{ row }"
          ><span class="mono">{{ row.refundNo }}</span></template
        >
      </el-table-column>
      <el-table-column label="业务" prop="bizType" width="90">
        <template #default="{ row }"
          ><span class="muted">{{ BIZ_LABEL[row.bizType] ?? row.bizType }}</span></template
        >
      </el-table-column>
      <el-table-column label="订单 ID" prop="bizOrderId" width="160">
        <template #default="{ row }"
          ><span class="mono">{{ row.bizOrderId }}</span></template
        >
      </el-table-column>
      <el-table-column label="金额" align="right" width="130">
        <template #default="{ row }"
          ><span class="mono">{{ fmtYuan(row.amount) }}</span></template
        >
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <StatusTag :status="row.status" :label="STATUS_LABEL[row.status] ?? row.status" />
        </template>
      </el-table-column>
      <el-table-column label="支付方" prop="provider" width="110">
        <template #default="{ row }"
          ><span class="muted">{{ row.provider }}</span></template
        >
      </el-table-column>
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">
          <span class="muted">{{ new Date(row.createdAt).toLocaleString() }}</span>
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
