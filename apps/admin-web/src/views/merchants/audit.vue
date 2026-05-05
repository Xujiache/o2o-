<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { type ApplicationListItemVo, type AuditStatus, listApplications } from '@/api/admin-merchants';

const router = useRouter();
const loading = ref(false);
const list = ref<ApplicationListItemVo[]>([]);
const total = ref(0);

const query = reactive<{
  auditStatus: AuditStatus | '';
  keyword: string;
  pageNo: number;
  pageSize: number;
}>({
  auditStatus: '',
  keyword: '',
  pageNo: 1,
  pageSize: 20,
});

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const r = await listApplications({
      auditStatus: query.auditStatus || undefined,
      keyword: query.keyword || undefined,
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
  query.auditStatus = '';
  query.keyword = '';
  query.pageNo = 1;
  void fetchList();
}

function viewDetail(row: ApplicationListItemVo): void {
  router.push(`/admin/merchants/applications/${row.applicationId}`);
}

onMounted(fetchList);
</script>

<template>
  <div class="merchant-audit">
    <el-card>
      <el-form :model="query" :inline="true">
        <el-form-item label="关键字">
          <el-input v-model="query.keyword" placeholder="店名 / 法人 / 商家ID" clearable @keyup.enter="onSearch" />
        </el-form-item>
        <el-form-item label="审核状态">
          <el-select v-model="query.auditStatus" placeholder="全部" clearable style="width: 140px">
            <el-option label="待审" value="pending" />
            <el-option label="通过" value="approved" />
            <el-option label="驳回" value="rejected" />
            <el-option label="禁用" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="申请 ID" prop="applicationId" width="120" />
        <el-table-column label="商家 ID" prop="merchantId" width="100" />
        <el-table-column label="店铺名" prop="storeName" />
        <el-table-column label="法人" prop="legalPersonMasked" width="120" />
        <el-table-column label="营业执照" prop="licenseNoMasked" width="200" />
        <el-table-column label="状态" prop="auditStatus" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.auditStatus === 'approved' ? 'success' : row.auditStatus === 'rejected' ? 'danger' : 'warning'"
            >
              {{ row.auditStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" prop="submittedAt" width="180" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="merchant-audit__pagination">
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
.merchant-audit {
  padding: 16px;
}
.merchant-audit__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
