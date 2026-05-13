<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { listBatches, type TraceBatchVo } from '@/api/admin-trace';
import DataTable from '@/components/DataTable.vue';
import FilterBar from '@/components/FilterBar.vue';
import PageContainer from '@/components/PageContainer.vue';
import StatusTag from '@/components/StatusTag.vue';
import { formatDate, formatDateTime } from '@/utils/format';

const router = useRouter();
const loading = ref(false);
const list = ref<TraceBatchVo[]>([]);
const total = ref(0);
const fmtDateTime = formatDateTime;
const fmtDate = formatDate;

const query = reactive<{ productId: string; pageNo: number; pageSize: number }>({
  productId: '',
  pageNo: 1,
  pageSize: 20,
});

function statusTone(status: number): 'success' | 'neutral' | 'danger' {
  if (status === 1) return 'success';
  if (status === 0) return 'neutral';
  return 'danger';
}
function statusLabel(status: number): string {
  if (status === 1) return '正常';
  if (status === 0) return '草稿';
  return '作废';
}

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const r = await listBatches({
      productId: query.productId || undefined,
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
  query.productId = '';
  query.pageNo = 1;
  void fetchList();
}

function goCreate(): void {
  router.push('/admin/trace/batches/create');
}
function goDetail(row: TraceBatchVo): void {
  router.push(`/admin/trace/batches/${row.traceBatchId}`);
}
function goStats(row: TraceBatchVo): void {
  router.push(`/admin/trace/stats?batchId=${row.traceBatchId}`);
}

onMounted(fetchList);
</script>

<template>
  <PageContainer title="批次管理" subtitle="生鲜溯源批次 · 总量/生产日期/已生成 QR">
    <template #extra>
      <el-button type="primary" @click="goCreate">
        <el-icon><Plus /></el-icon>
        <span style="margin-left: 6px">新建批次</span>
      </el-button>
      <el-button @click="fetchList">
        <el-icon><Refresh /></el-icon>
        <span style="margin-left: 6px">刷新</span>
      </el-button>
    </template>

    <FilterBar @search="onSearch" @reset="onReset">
      <div class="filter-field">
        <label>商品 ID</label>
        <el-input
          v-model="query.productId"
          placeholder="productId"
          clearable
          style="width: 240px"
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
      <el-table-column label="批次 ID" prop="traceBatchId" width="180">
        <template #default="{ row }">
          <span class="mono">{{ row.traceBatchId }}</span>
        </template>
      </el-table-column>
      <el-table-column label="批次号" prop="batchNo" width="140">
        <template #default="{ row }">
          <span class="mono">{{ row.batchNo }}</span>
        </template>
      </el-table-column>
      <el-table-column label="商品 ID" prop="productId" width="160" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="mono">{{ row.productId }}</span>
        </template>
      </el-table-column>
      <el-table-column label="总量" prop="totalCount" width="90" align="right" />
      <el-table-column label="生产日期" width="120">
        <template #default="{ row }">
          <span class="muted">{{ fmtDate(row.producedAt) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="保质期" width="90">
        <template #default="{ row }">
          <span v-if="row.shelfLifeDays != null">{{ row.shelfLifeDays }} 天</span>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column label="供应商" prop="supplierName" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.supplierName">{{ row.supplierName }}</span>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <StatusTag :status="String(row.status)" :label="statusLabel(row.status)" :tone="statusTone(row.status)" />
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">
          <span class="muted">{{ fmtDateTime(row.createdAt) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="goDetail(row)">详情</el-button>
          <el-button link type="primary" @click="goStats(row)">统计</el-button>
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
