<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

import { type DisableRecordItemVo, listDisableRecords } from '@/api/admin-customer-disable';

const loading = ref(false);
const list = ref<DisableRecordItemVo[]>([]);
const total = ref(0);
const query = reactive<{
  accountType: '' | 'customer' | 'merchant' | 'rider';
  accountId: string;
  pageNo: number;
  pageSize: number;
}>({ accountType: '', accountId: '', pageNo: 1, pageSize: 20 });

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const r = await listDisableRecords({
      accountType: (query.accountType || undefined) as undefined | 'customer' | 'merchant' | 'rider',
      accountId: query.accountId || undefined,
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

function onSearch(): void {
  query.pageNo = 1;
  void fetchList();
}

function fmtDate(ts: string): string {
  const n = Number(ts);
  if (!n) return '-';
  return new Date(n).toLocaleString();
}

onMounted(fetchList);
</script>

<template>
  <div class="disable-records">
    <el-card>
      <template #header>
        <div class="header">
          <span>账号禁用启用流水</span>
        </div>
      </template>
      <el-form :model="query" :inline="true">
        <el-form-item label="账号类型">
          <el-select v-model="query.accountType" placeholder="全部" clearable style="width: 140px">
            <el-option label="用户" value="customer" />
            <el-option label="商家" value="merchant" />
            <el-option label="骑手" value="rider" />
          </el-select>
        </el-form-item>
        <el-form-item label="账号 ID">
          <el-input v-model="query.accountId" placeholder="账号 ID" clearable @keyup.enter="onSearch" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="时间" width="180">
          <template #default="{ row }">{{ fmtDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="账号类型" prop="accountType" width="100" />
        <el-table-column label="账号 ID" prop="accountId" width="140" />
        <el-table-column label="动作" width="100">
          <template #default="{ row }">
            <el-tag :type="row.action === 'disable' ? 'danger' : 'success'">
              {{ row.action === 'disable' ? '禁用' : '启用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="原因" prop="reason" />
        <el-table-column label="操作人" prop="operatorUsername" width="140" />
      </el-table>

      <div class="pagination">
        <el-pagination
          background
          layout="total, prev, pager, next, sizes"
          :total="total"
          :current-page="query.pageNo"
          :page-size="query.pageSize"
          @current-change="
            (p: number) => {
              query.pageNo = p;
              void fetchList();
            }
          "
          @size-change="
            (s: number) => {
              query.pageSize = s;
              query.pageNo = 1;
              void fetchList();
            }
          "
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.disable-records {
  padding: 16px;
}
.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
