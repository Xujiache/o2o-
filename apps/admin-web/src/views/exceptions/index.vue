<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

import { listRiskExceptions, type RiskExceptionItemVo } from '@/api/admin-risk';

const loading = ref(false);
const list = ref<RiskExceptionItemVo[]>([]);
const total = ref(0);
const query = reactive({ status: '', exceptionType: '', pageNo: 1, pageSize: 20 });

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await listRiskExceptions({
      status: query.status || undefined,
      exceptionType: query.exceptionType || undefined,
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

onMounted(load);
</script>

<template>
  <el-card>
    <template #header>异常订单监控</template>
    <el-form :model="query" inline size="small" style="margin-bottom: 8px">
      <el-form-item label="状态">
        <el-select v-model="query.status" style="width: 120px" clearable>
          <el-option label="全部" value="" />
          <el-option label="待处理" value="OPEN" />
          <el-option label="已处理" value="HANDLED" />
          <el-option label="已忽略" value="IGNORED" />
        </el-select>
      </el-form-item>
      <el-button type="primary" @click="load">查询</el-button>
    </el-form>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="logId" label="ID" width="80" />
      <el-table-column prop="exceptionType" label="类型" width="180" />
      <el-table-column prop="bizType" label="业务" width="80" />
      <el-table-column prop="bizOrderId" label="订单 ID" width="140" />
      <el-table-column prop="severity" label="级别" width="80" />
      <el-table-column prop="description" label="描述" />
      <el-table-column prop="status" label="状态" width="100" />
    </el-table>
    <el-pagination
      v-model:current-page="query.pageNo"
      v-model:page-size="query.pageSize"
      :total="total"
      style="margin-top: 16px"
      layout="total, prev, pager, next"
      @current-change="load"
    />
  </el-card>
</template>
