<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

import {
  type AdminFoodOrderListItem,
  type FoodOrderStatus,
  getTimelineStats,
  listFoodOrders,
  type TimelineStatsVo,
} from '@/api/admin-food-orders';

import FoodOrderDetailDrawer from './components/FoodOrderDetailDrawer.vue';

const loading = ref(false);
const list = ref<AdminFoodOrderListItem[]>([]);
const total = ref(0);
const stats = ref<TimelineStatsVo | null>(null);
const drawerVisible = ref(false);
const drawerOrderId = ref<string | null>(null);

const STATUS_OPTIONS: Array<{ label: string; value: FoodOrderStatus | '' }> = [
  { label: '全部', value: '' },
  { label: '待支付', value: 'WAIT_PAY' },
  { label: '等商家', value: 'PAID_WAIT_MERCHANT' },
  { label: '配送中', value: 'DELIVERING' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已取消', value: 'CANCELLED' },
];

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

const fmtDate = (ts: number): string => new Date(ts).toLocaleString();
const fmtYuan = (cents: string): string => (Number(cents) / 100).toFixed(2);

onMounted(() => {
  void fetchList();
  void fetchStats();
});
</script>

<template>
  <div class="food-orders">
    <el-row :gutter="16" class="food-orders__stats">
      <el-col :span="4"
        ><el-card
          ><div class="stat-num">{{ stats?.waitPayOverdueCount ?? '-' }}</div>
          <div class="stat-lbl">待支付超时</div></el-card
        ></el-col
      >
      <el-col :span="4"
        ><el-card
          ><div class="stat-num">{{ stats?.merchantAcceptOverdueCount ?? '-' }}</div>
          <div class="stat-lbl">商家未接 10min+</div></el-card
        ></el-col
      >
      <el-col :span="4"
        ><el-card
          ><div class="stat-num">{{ stats?.deliveringCount ?? '-' }}</div>
          <div class="stat-lbl">配送中</div></el-card
        ></el-col
      >
      <el-col :span="4"
        ><el-card
          ><div class="stat-num">{{ stats?.completedTodayCount ?? '-' }}</div>
          <div class="stat-lbl">今日完成</div></el-card
        ></el-col
      >
      <el-col :span="4"
        ><el-card
          ><div class="stat-num">{{ stats?.cancelledTodayCount ?? '-' }}</div>
          <div class="stat-lbl">今日取消</div></el-card
        ></el-col
      >
    </el-row>

    <el-card>
      <template #header>外卖订单</template>
      <el-form :model="query" :inline="true">
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 140px">
            <el-option v-for="o in STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="城市">
          <el-input v-model="query.cityCode" placeholder="cityCode" clearable style="width: 120px" />
        </el-form-item>
        <el-form-item label="用户 id">
          <el-input v-model="query.customerId" placeholder="customerId" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item label="店铺 id">
          <el-input v-model="query.storeId" placeholder="storeId" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            @click="
              query.pageNo = 1;
              void fetchList();
            "
            >查询</el-button
          >
        </el-form-item>
      </el-form>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="订单号" prop="orderNo" width="180" />
        <el-table-column label="状态" prop="status" width="160" />
        <el-table-column label="支付" prop="payStatus" width="100" />
        <el-table-column label="用户" prop="customerId" width="120" />
        <el-table-column label="店铺" prop="storeId" width="100" />
        <el-table-column label="城市" prop="cityCode" width="80" />
        <el-table-column label="应付">
          <template #default="{ row }">¥ {{ fmtYuan(row.payableAmount) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ fmtDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="food-orders__pagination">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="total"
          :current-page="query.pageNo"
          :page-size="query.pageSize"
          @current-change="
            (p: number) => {
              query.pageNo = p;
              void fetchList();
            }
          "
        />
      </div>
    </el-card>

    <FoodOrderDetailDrawer v-model:visible="drawerVisible" :order-id="drawerOrderId" />
  </div>
</template>

<style scoped>
.food-orders {
  padding: 16px;
}
.food-orders__stats {
  margin-bottom: 16px;
}
.stat-num {
  font-size: 24px;
  font-weight: 600;
  color: #ff6633;
  text-align: center;
}
.stat-lbl {
  text-align: center;
  color: #888;
  font-size: 12px;
  margin-top: 4px;
}
.food-orders__pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
