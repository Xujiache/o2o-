<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

import { type AdminRefundItemVo, listRefunds } from '@/api/admin-refunds';

const loading = ref(false);
const list = ref<AdminRefundItemVo[]>([]);
const total = ref(0);
const query = reactive({ status: '', bizType: '', pageNo: 1, pageSize: 20 });

async function load(): Promise<void> {
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

onMounted(load);
</script>

<template>
  <el-card>
    <template #header>退款执行</template>
    <el-form :model="query" inline size="small" style="margin-bottom: 8px">
      <el-form-item label="状态">
        <el-select v-model="query.status" style="width: 120px" clearable>
          <el-option label="全部" value="" />
          <el-option label="处理中" value="PENDING" />
          <el-option label="成功" value="SUCCESS" />
          <el-option label="失败" value="FAILED" />
        </el-select>
      </el-form-item>
      <el-form-item label="业务">
        <el-select v-model="query.bizType" style="width: 100px" clearable>
          <el-option label="全部" value="" />
          <el-option label="外卖" value="FOOD" />
          <el-option label="跑腿" value="ERRAND" />
        </el-select>
      </el-form-item>
      <el-button type="primary" @click="load">查询</el-button>
    </el-form>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="refundNo" label="退款单号" width="180" />
      <el-table-column prop="bizType" label="业务" width="80" />
      <el-table-column prop="bizOrderId" label="订单 ID" width="140" />
      <el-table-column prop="amount" label="金额(分)" width="120" />
      <el-table-column prop="status" label="状态" width="100" />
      <el-table-column prop="provider" label="支付方" width="100" />
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
      </el-table-column>
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
