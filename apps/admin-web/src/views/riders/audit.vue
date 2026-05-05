<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { type AuditStatus, listRiders, type RiderListItemVo } from '@/api/admin-riders';

const router = useRouter();
const loading = ref(false);
const list = ref<RiderListItemVo[]>([]);
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
    const r = await listRiders({
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

function viewDetail(row: RiderListItemVo): void {
  router.push(`/admin/riders/applications/${row.applicationId}`);
}

onMounted(fetchList);
</script>

<template>
  <div class="rider-audit">
    <el-card>
      <el-form :model="query" :inline="true">
        <el-form-item label="关键字">
          <el-input v-model="query.keyword" placeholder="姓名 / 手机 / 身份证" clearable @keyup.enter="onSearch" />
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
        <el-table-column label="骑手 ID" prop="riderId" width="100" />
        <el-table-column label="手机号" prop="mobile" width="140" />
        <el-table-column label="姓名" prop="realName" width="120" />
        <el-table-column label="身份证" prop="idCardNo" width="200" />
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

      <div class="rider-audit__pagination">
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
.rider-audit {
  padding: 16px;
}
.rider-audit__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
