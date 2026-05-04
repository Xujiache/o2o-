<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { type AccountStatus, type CustomerListItemVo, listCustomers, type RealnameStatus } from '@/api/admin-customers';

const router = useRouter();
const loading = ref(false);
const list = ref<CustomerListItemVo[]>([]);
const total = ref(0);

const query = reactive<{
  keyword: string;
  realnameStatus: RealnameStatus | '';
  accountStatus: AccountStatus | '';
  pageNo: number;
  pageSize: number;
}>({
  keyword: '',
  realnameStatus: '',
  accountStatus: '',
  pageNo: 1,
  pageSize: 20,
});

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const r = await listCustomers({
      keyword: query.keyword || undefined,
      realnameStatus: query.realnameStatus || undefined,
      accountStatus: query.accountStatus || undefined,
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

function onReset(): void {
  query.keyword = '';
  query.realnameStatus = '';
  query.accountStatus = '';
  query.pageNo = 1;
  void fetchList();
}

function viewDetail(row: CustomerListItemVo): void {
  router.push(`/admin/customers/${row.userId}`);
}

onMounted(fetchList);
</script>

<template>
  <div class="customers">
    <el-card>
      <el-form :model="query" :inline="true">
        <el-form-item label="关键字">
          <el-input v-model="query.keyword" placeholder="userId / 手机号" clearable @keyup.enter="onSearch" />
        </el-form-item>
        <el-form-item label="实名状态">
          <el-select v-model="query.realnameStatus" placeholder="全部" clearable style="width: 140px">
            <el-option label="未实名" value="unverified" />
            <el-option label="审核中" value="pending" />
            <el-option label="已实名" value="verified" />
            <el-option label="失败" value="failed" />
          </el-select>
        </el-form-item>
        <el-form-item label="账号状态">
          <el-select v-model="query.accountStatus" placeholder="全部" clearable style="width: 140px">
            <el-option label="正常" value="active" />
            <el-option label="禁用" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="用户 ID" prop="userId" width="120" />
        <el-table-column label="手机号" prop="mobileMasked" width="150" />
        <el-table-column label="昵称" prop="nickname" />
        <el-table-column label="实名状态" prop="realnameStatus" width="120" />
        <el-table-column label="账号状态" prop="accountStatus" width="100">
          <template #default="{ row }">
            <el-tag :type="row.accountStatus === 'disabled' ? 'danger' : 'success'">
              {{ row.accountStatus === 'disabled' ? '已禁用' : '正常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" prop="registeredAt" width="180" />
        <el-table-column label="最近登录" prop="lastLoginAt" width="180" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="customers__pagination">
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
.customers {
  padding: 16px;
}
.customers__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
