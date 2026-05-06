<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { ref } from 'vue';

import { createExport, type ExportTaskVo, getExport } from '@/api/admin-exports';

const loading = ref(false);
const exportType = ref('food-orders');
const taskId = ref<string | null>(null);
const detail = ref<ExportTaskVo | null>(null);

async function create(): Promise<void> {
  loading.value = true;
  try {
    const r = await createExport({ exportType: exportType.value });
    if (r.code === '0' && r.data) {
      taskId.value = r.data.exportTaskId;
      detail.value = r.data;
      ElMessage.success('导出任务已创建');
    } else {
      ElMessage.error(r.message);
    }
  } finally {
    loading.value = false;
  }
}

async function refresh(): Promise<void> {
  if (!taskId.value) return;
  const r = await getExport(taskId.value);
  if (r.code === '0' && r.data) detail.value = r.data;
}
</script>

<template>
  <el-card>
    <template #header>报表导出中心</template>
    <el-form inline label-width="100px">
      <el-form-item label="导出类型">
        <el-select v-model="exportType" style="width: 200px">
          <el-option label="外卖订单" value="food-orders" />
          <el-option label="跑腿订单" value="errand-orders" />
          <el-option label="结算单" value="settlements" />
          <el-option label="提现单" value="withdrawals" />
        </el-select>
      </el-form-item>
      <el-button type="primary" :loading="loading" @click="create">创建导出任务</el-button>
      <el-button v-if="taskId" @click="refresh">刷新进度</el-button>
    </el-form>
    <el-descriptions v-if="detail" :column="2" border style="margin-top: 16px">
      <el-descriptions-item label="任务 ID">{{ detail.exportTaskId }}</el-descriptions-item>
      <el-descriptions-item label="编号">{{ detail.exportNo }}</el-descriptions-item>
      <el-descriptions-item label="类型">{{ detail.exportType }}</el-descriptions-item>
      <el-descriptions-item label="状态">{{ detail.status }}</el-descriptions-item>
      <el-descriptions-item v-if="detail.fileUrl" label="文件">
        <el-link :href="detail.fileUrl" type="primary" target="_blank">下载</el-link>
      </el-descriptions-item>
      <el-descriptions-item v-if="detail.errorMessage" label="错误">{{ detail.errorMessage }}</el-descriptions-item>
    </el-descriptions>
  </el-card>
</template>
