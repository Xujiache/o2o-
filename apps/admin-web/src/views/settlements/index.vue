<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

import { type AdminSettlementListItemVo, listSettlements } from '@/api/admin-settlements';

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

async function load(): Promise<void> {
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
  void load();
}

function fmt(cents: string): string {
  return (Number(cents) / 100).toFixed(2);
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString();
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
        <span>结算单监控</span>
        <el-form :model="query" :inline="true" size="small">
          <el-form-item label="状态">
            <el-select v-model="query.status" style="width: 160px">
              <el-option v-for="o in STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="店铺 ID">
            <el-input v-model="query.storeId" placeholder="storeId" style="width: 160px" />
          </el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
        </el-form>
      </div>
    </template>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="settlementNo" label="结算单号" width="180" />
      <el-table-column prop="storeId" label="店铺" width="100" />
      <el-table-column label="周期" width="220">
        <template #default="{ row }"> {{ fmtDate(row.periodStart) }} ~ {{ fmtDate(row.periodEnd) }} </template>
      </el-table-column>
      <el-table-column label="毛收入">
        <template #default="{ row }">¥{{ fmt(row.grossCents) }}</template>
      </el-table-column>
      <el-table-column label="佣金">
        <template #default="{ row }">¥{{ fmt(row.commissionCents) }}</template>
      </el-table-column>
      <el-table-column label="通道费">
        <template #default="{ row }">¥{{ fmt(row.feeCents) }}</template>
      </el-table-column>
      <el-table-column label="实结">
        <template #default="{ row }">¥{{ fmt(row.netCents) }}</template>
      </el-table-column>
      <el-table-column prop="orderCount" label="订单数" width="80" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">{{ STATUS_LABEL[row.status] || row.status }}</template>
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewDetail(row.settlementId)">详情</el-button>
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

    <SettlementDetailDrawer v-model:visible="drawerVisible" :settlement-id="drawerId" />
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
