<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { type DashboardOverviewVo, getDashboardOverview } from '@/api/admin-dashboard';

const loading = ref(false);
const data = ref<DashboardOverviewVo | null>(null);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await getDashboardOverview();
    if (r.code === '0' && r.data) data.value = r.data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <el-card v-loading="loading">
    <template #header>
      <div class="header">
        <span>数据大屏</span>
        <el-button size="small" @click="load">刷新</el-button>
      </div>
    </template>
    <el-row v-if="data" :gutter="16">
      <el-col :span="6"><el-statistic title="GMV (分)" :value="Number(data.gmv)" /></el-col>
      <el-col :span="6"><el-statistic title="订单数" :value="data.orderCount" /></el-col>
      <el-col :span="6"><el-statistic title="活跃用户" :value="data.activeUsers" /></el-col>
      <el-col :span="6"><el-statistic title="在线骑手" :value="data.onlineRiders" /></el-col>
    </el-row>
    <el-row v-if="data" style="margin-top: 16px">
      <el-col :span="6"><el-statistic title="异常订单" :value="data.exceptionOrders" /></el-col>
    </el-row>
  </el-card>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
