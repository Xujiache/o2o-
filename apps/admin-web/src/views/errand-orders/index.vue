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

const URGENT_LABEL: Record<string, string> = {
  standard: '标准',
  fast: '加急',
  express: '特急',
};

const query = reactive<{
  status: ErrandOrderStatus | '';
  typeCode: ErrandTypeCode | '';
  customerId: string;
  page: number;
  pageSize: number;
}>({
  status: '',
  typeCode: '',
  customerId: '',
  page: 1,
  pageSize: 20,
});

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const r = await listErrandOrders({
      status: query.status || undefined,
      typeCode: query.typeCode || undefined,
      customerId: query.customerId || undefined,
      page: query.page,
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
  query.page = 1;
  void fetchList();
}

function onReset(): void {
  query.status = '';
  query.typeCode = '';
  query.customerId = '';
  query.page = 1;
  void fetchList();
}

function onPageChange(p: number): void {
  query.page = p;
  void fetchList();
}

const fmtDate = (ts: number): string => new Date(ts).toLocaleString();
const fmtYuan = (cents: string): string => (Number(cents) / 100).toFixed(2);

onMounted(() => {
  void fetchList();
  void fetchStats();
});
</script>

<template>
  <div class="errand-orders">
    <el-row :gutter="12" class="errand-orders__stats">
      <el-col :span="3">
        <el-card>
          <div class="stat-num">{{ stats?.totalCount ?? '-' }}</div>
          <div class="stat-lbl">总订单数</div>
        </el-card>
      </el-col>
      <el-col :span="3">
        <el-card>
          <div class="stat-num">{{ stats?.waitPayCount ?? '-' }}</div>
          <div class="stat-lbl">待支付</div>
        </el-card>
      </el-col>
      <el-col :span="3">
        <el-card>
          <div class="stat-num">{{ stats?.paidCount ?? '-' }}</div>
          <div class="stat-lbl">已支付</div>
        </el-card>
      </el-col>
      <el-col :span="3">
        <el-card>
          <div class="stat-num">{{ stats?.dispatchingCount ?? '-' }}</div>
          <div class="stat-lbl">派单中</div>
        </el-card>
      </el-col>
      <el-col :span="3">
        <el-card>
          <div class="stat-num">{{ stats?.assignedCount ?? '-' }}</div>
          <div class="stat-lbl">骑手已接</div>
        </el-card>
      </el-col>
      <el-col :span="3">
        <el-card>
          <div class="stat-num">{{ stats?.completedCount ?? '-' }}</div>
          <div class="stat-lbl">已完成</div>
        </el-card>
      </el-col>
      <el-col :span="3">
        <el-card>
          <div class="stat-num">{{ stats?.cancelledCount ?? '-' }}</div>
          <div class="stat-lbl">已取消</div>
        </el-card>
      </el-col>
      <el-col :span="3">
        <el-card>
          <div class="stat-num">¥{{ fmtYuan(stats?.totalAmount ?? '0') }}</div>
          <div class="stat-lbl">总金额</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="errand-orders__filters">
      <el-form :inline="true" :model="query">
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" style="width: 140px">
            <el-option v-for="o in STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="query.typeCode" placeholder="全部" style="width: 140px">
            <el-option v-for="o in TYPE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="customerId">
          <el-input v-model="query.customerId" placeholder="customerId" style="width: 160px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="errand-orders__table">
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="orderNo" label="订单号" width="160" />
        <el-table-column prop="typeCode" label="类型" width="80">
          <template #default="{ row }">
            <el-tag size="small">{{ row.typeCode }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120" />
        <el-table-column prop="urgentLevel" label="紧急度" width="80">
          <template #default="{ row }">
            <span>{{ URGENT_LABEL[row.urgentLevel] ?? row.urgentLevel }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="customerId" label="客户" width="120" />
        <el-table-column label="应付金额" width="120">
          <template #default="{ row }">¥{{ fmtYuan(row.payableAmount) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ fmtDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        class="errand-orders__pager"
        :current-page="query.page"
        :page-size="query.pageSize"
        :total="total"
        @current-change="onPageChange"
      />
    </el-card>

    <ErrandOrderDetailDrawer v-model:visible="drawerVisible" :order-id="drawerOrderId" />
  </div>
</template>

<style scoped>
.errand-orders {
  padding: 16px;
}
.errand-orders__stats {
  margin-bottom: 12px;
}
.errand-orders__filters {
  margin-bottom: 12px;
}
.errand-orders__table {
  padding: 8px;
}
.errand-orders__pager {
  margin-top: 12px;
  text-align: right;
}
.stat-num {
  font-size: 20px;
  font-weight: bold;
}
.stat-lbl {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}
</style>
