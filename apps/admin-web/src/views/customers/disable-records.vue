<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

import { type DisableRecordItemVo, listDisableRecords } from '@/api/admin-customer-disable';
import DataTable from '@/components/DataTable.vue';
import FilterBar from '@/components/FilterBar.vue';
import PageContainer from '@/components/PageContainer.vue';
import StatusTag from '@/components/StatusTag.vue';

const loading = ref(false);
const list = ref<DisableRecordItemVo[]>([]);
const total = ref(0);
const query = reactive<{
  accountType: '' | 'customer' | 'merchant' | 'rider';
  accountId: string;
  pageNo: number;
  pageSize: number;
}>({ accountType: '', accountId: '', pageNo: 1, pageSize: 20 });

const TYPE_LABEL: Record<string, string> = { customer: '用户', merchant: '商家', rider: '骑手' };

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const r = await listDisableRecords({
      accountType: (query.accountType || undefined) as undefined | 'customer' | 'merchant' | 'rider',
      accountId: query.accountId || undefined,
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

function onSearch(): void {
  query.pageNo = 1;
  void fetchList();
}

function onReset(): void {
  query.accountType = '';
  query.accountId = '';
  query.pageNo = 1;
  void fetchList();
}

function fmtDate(ts: string): string {
  const n = Number(ts);
  if (!n) return '-';
  return new Date(n).toLocaleString();
}

onMounted(fetchList);
</script>

<template>
  <PageContainer title="账号禁用启用流水" subtitle="多账号类型的禁用/解禁操作审计">
    <template #extra>
      <el-button @click="fetchList">
        <el-icon><Refresh /></el-icon>
        <span style="margin-left: 6px">刷新</span>
      </el-button>
    </template>

    <FilterBar @search="onSearch" @reset="onReset">
      <div class="filter-field">
        <label>账号类型</label>
        <el-select v-model="query.accountType" placeholder="全部" clearable style="width: 140px">
          <el-option label="用户" value="customer" />
          <el-option label="商家" value="merchant" />
          <el-option label="骑手" value="rider" />
        </el-select>
      </div>
      <div class="filter-field">
        <label>账号 ID</label>
        <el-input
          v-model="query.accountId"
          placeholder="账号 ID"
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
      <el-table-column label="时间" width="180">
        <template #default="{ row }"
          ><span class="muted">{{ fmtDate(row.createdAt) }}</span></template
        >
      </el-table-column>
      <el-table-column label="账号类型" prop="accountType" width="110">
        <template #default="{ row }">
          <span class="muted">{{ TYPE_LABEL[row.accountType] ?? row.accountType }}</span>
        </template>
      </el-table-column>
      <el-table-column label="账号 ID" prop="accountId" width="160">
        <template #default="{ row }"
          ><span class="mono">{{ row.accountId }}</span></template
        >
      </el-table-column>
      <el-table-column label="动作" width="100">
        <template #default="{ row }">
          <StatusTag
            :status="row.action === 'disable' ? 'disabled' : 'enabled'"
            :label="row.action === 'disable' ? '禁用' : '启用'"
          />
        </template>
      </el-table-column>
      <el-table-column label="原因" prop="reason" />
      <el-table-column label="操作人" prop="operatorUsername" width="160">
        <template #default="{ row }"
          ><span class="mono">{{ row.operatorUsername }}</span></template
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
