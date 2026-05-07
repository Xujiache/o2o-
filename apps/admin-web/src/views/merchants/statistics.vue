<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

import { type AdminMerchantStatisticsItemVo, listMerchantStatistics } from '@/api/admin-merchant-statistics';

const loading = ref(false);
const list = ref<AdminMerchantStatisticsItemVo[]>([]);
const total = ref(0);

const query = reactive({
  storeId: '',
  snapshotDate: '',
  pageNo: 1,
  pageSize: 20,
});

function toSnapshotDate(): number | undefined {
  if (!query.snapshotDate) return undefined;
  const n = Number(query.snapshotDate);
  return Number.isInteger(n) ? n : undefined;
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await listMerchantStatistics({
      storeId: query.storeId || undefined,
      snapshotDate: toSnapshotDate(),
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
  query.storeId = '';
  query.snapshotDate = '';
  query.pageNo = 1;
  void load();
}

function fmtYuan(cents: string): string {
  return (Number(cents) / 100).toFixed(2);
}

onMounted(load);
</script>

<template>
  <el-card>
    <template #header>
      <div class="header">
        <span>商家经营快照</span>
        <el-form :model="query" :inline="true" size="small">
          <el-form-item label="店铺 ID">
            <el-input v-model="query.storeId" placeholder="storeId" clearable style="width: 160px" />
          </el-form-item>
          <el-form-item label="快照日期">
            <el-input v-model="query.snapshotDate" placeholder="YYYYMMDD，默认昨天" clearable style="width: 180px" />
          </el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form>
      </div>
    </template>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="snapshotDate" label="快照日期" width="110" />
      <el-table-column prop="storeId" label="店铺 ID" width="120" />
      <el-table-column prop="merchantId" label="商户 ID" width="120" />
      <el-table-column prop="orderCount" label="订单数" width="90" />
      <el-table-column label="流水">
        <template #default="{ row }">¥{{ fmtYuan(row.grossCents) }}</template>
      </el-table-column>
      <el-table-column label="退款">
        <template #default="{ row }">¥{{ fmtYuan(row.refundCents) }}</template>
      </el-table-column>
      <el-table-column label="净收入">
        <template #default="{ row }">¥{{ fmtYuan(row.netCents) }}</template>
      </el-table-column>
      <el-table-column prop="storeRating" label="店铺评分" width="100" />
      <el-table-column prop="snapshotId" label="快照 ID" min-width="160" show-overflow-tooltip />
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="query.pageNo"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="load"
        @size-change="load"
      />
    </div>
  </el-card>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
