<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { type AuditStatus, listRiders, type RiderListItemVo } from '@/api/admin-riders';

import DataTable from '@/components/DataTable.vue';
import FilterBar from '@/components/FilterBar.vue';
import PageContainer from '@/components/PageContainer.vue';
import StatusTag from '@/components/StatusTag.vue';
import { formatDateTime } from '@/utils/format';

const router = useRouter();
const loading = ref(false);
const list = ref<RiderListItemVo[]>([]);
const total = ref(0);
const fmtDateTime = formatDateTime;

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

const AUDIT_LABEL: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  disabled: '已禁用',
};

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
  <PageContainer title="骑手审核" subtitle="入驻资质 · 人脸 · 健康证核验">
    <template #extra>
      <el-button @click="fetchList">
        <el-icon><Refresh /></el-icon>
        <span style="margin-left: 6px">刷新</span>
      </el-button>
    </template>

    <FilterBar @search="onSearch" @reset="onReset">
      <div class="filter-field">
        <label>关键字</label>
        <el-input
          v-model="query.keyword"
          placeholder="姓名 / 手机 / 身份证"
          clearable
          style="width: 240px"
          @keyup.enter="onSearch"
        />
      </div>
      <div class="filter-field">
        <label>审核状态</label>
        <el-select v-model="query.auditStatus" placeholder="全部" clearable style="width: 160px">
          <el-option label="待审核" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="已驳回" value="rejected" />
          <el-option label="已禁用" value="disabled" />
        </el-select>
      </div>
    </FilterBar>

    <DataTable
      :data="list"
      :loading="loading"
      :total="total"
      v-model:pageNo="query.pageNo"
      v-model:pageSize="query.pageSize"
      @page-change="fetchList"
    >
      <el-table-column label="申请 ID" prop="applicationId" width="140">
        <template #default="{ row }"
          ><span class="mono">{{ row.applicationId }}</span></template
        >
      </el-table-column>
      <el-table-column label="骑手 ID" prop="riderId" width="120">
        <template #default="{ row }">
          <span v-if="row.riderId" class="mono">{{ row.riderId }}</span>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column label="手机号" prop="mobile" width="140">
        <template #default="{ row }"
          ><span class="mono">{{ row.mobile }}</span></template
        >
      </el-table-column>
      <el-table-column label="姓名" prop="realName" width="120" />
      <el-table-column label="身份证" prop="idCardNo" width="200">
        <template #default="{ row }"
          ><span class="mono">{{ row.idCardNo }}</span></template
        >
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <StatusTag :status="row.auditStatus" :label="AUDIT_LABEL[row.auditStatus] || row.auditStatus" />
        </template>
      </el-table-column>
      <el-table-column label="提交时间" width="180">
        <template #default="{ row }"
          ><span class="muted">{{ fmtDateTime(row.submittedAt) }}</span></template
        >
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </DataTable>
  </PageContainer>
</template>

<style scoped>
.mono {
  font-family: var(--font-mono);
  font-size: 12px;
}
.muted {
  color: var(--fg-muted);
  font-size: 12px;
}
</style>
