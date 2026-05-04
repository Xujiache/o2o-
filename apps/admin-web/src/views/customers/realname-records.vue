<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { listRealnameRecords, type RealnameRecordItemVo } from '@/api/admin-customers';

const route = useRoute();
const router = useRouter();
const userId = String(route.params.id);

const list = ref<RealnameRecordItemVo[]>([]);
const total = ref(0);
const pageNo = ref(1);
const pageSize = ref(20);
const loading = ref(false);

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const r = await listRealnameRecords(userId, pageNo.value, pageSize.value);
    if (r.code === '0' && r.data) {
      list.value = r.data.list;
      total.value = r.data.total;
    }
  } finally {
    loading.value = false;
  }
}

onMounted(fetchList);
</script>

<template>
  <div class="rn-records" v-loading="loading">
    <el-page-header @back="router.back()" :content="`用户 ${userId} - 实名记录`" />
    <el-card class="rn-records__card">
      <el-table :data="list" stripe>
        <el-table-column label="记录 ID" prop="recordId" width="120" />
        <el-table-column label="姓名(脱敏)" prop="realNameMasked" />
        <el-table-column label="身份证(脱敏)" prop="idCardMasked" />
        <el-table-column label="状态" prop="status" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : row.status === 'failed' ? 'danger' : 'warning'">{{
              row.status
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="失败原因" prop="failedReason" />
        <el-table-column label="认证时间" prop="verifiedAt" width="180" />
        <el-table-column label="创建时间" prop="createdAt" width="180" />
      </el-table>

      <div class="rn-records__pagination">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="total"
          :current-page="pageNo"
          :page-size="pageSize"
          @current-change="
            (p: number) => {
              pageNo = p;
              void fetchList();
            }
          "
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.rn-records {
  padding: 16px;
}
.rn-records__card {
  margin-top: 16px;
}
.rn-records__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
