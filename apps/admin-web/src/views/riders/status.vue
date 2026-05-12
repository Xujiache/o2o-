<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';

import {
  type AccountStatus,
  type AuditStatus,
  listRiders,
  type RiderListItemVo,
  updateRiderStatus,
} from '@/api/admin-riders';

import DataTable from '@/components/DataTable.vue';
import FilterBar from '@/components/FilterBar.vue';
import PageContainer from '@/components/PageContainer.vue';
import StatusTag from '@/components/StatusTag.vue';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const loading = ref(false);
const list = ref<RiderListItemVo[]>([]);
const total = ref(0);

const query = reactive<{
  accountStatus: AccountStatus | '';
  pageNo: number;
  pageSize: number;
}>({
  accountStatus: '',
  pageNo: 1,
  pageSize: 20,
});

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const r = await listRiders({
      accountStatus: query.accountStatus || undefined,
      auditStatus: 'approved' as AuditStatus,
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
  query.accountStatus = '';
  query.pageNo = 1;
  void fetchList();
}

async function onToggle(row: RiderListItemVo, target: 'enabled' | 'disabled'): Promise<void> {
  if (!row.riderId) {
    ElMessage.warning('骑手未审核通过,无 rider_id');
    return;
  }
  try {
    const reasonRes = await ElMessageBox.prompt(
      `确认将 ${row.realName} (${row.mobile}) ${target === 'enabled' ? '启用' : '禁用'}?`,
      '账号管控',
      { confirmButtonText: '确认', cancelButtonText: '取消', inputPlaceholder: '操作原因(选填)' },
    );
    const r = await updateRiderStatus(row.riderId, { targetStatus: target, reason: reasonRes.value?.trim() });
    if (r.code === '0') {
      ElMessage.success('已生效');
      void fetchList();
    } else {
      ElMessage.error(r.message || '操作失败');
    }
  } catch {
    /* 取消 */
  }
}

onMounted(fetchList);
</script>

<template>
  <PageContainer title="骑手账号管控" subtitle="已通过审核骑手的启用 / 禁用">
    <template #extra>
      <el-button @click="fetchList">
        <el-icon><Refresh /></el-icon>
        <span style="margin-left: 6px">刷新</span>
      </el-button>
    </template>

    <FilterBar @search="onSearch" @reset="onReset">
      <div class="filter-field">
        <label>账号状态</label>
        <el-select v-model="query.accountStatus" placeholder="全部" clearable style="width: 160px">
          <el-option label="启用" value="active" />
          <el-option label="禁用" value="disabled" />
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
      <el-table-column label="骑手 ID" prop="riderId" width="140">
        <template #default="{ row }">
          <span v-if="row.riderId" class="mono">{{ row.riderId }}</span>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column label="手机号" prop="mobile" width="160">
        <template #default="{ row }"
          ><span class="mono">{{ row.mobile }}</span></template
        >
      </el-table-column>
      <el-table-column label="姓名" prop="realName" width="140" />
      <el-table-column label="身份证" prop="idCardNo" width="220">
        <template #default="{ row }"
          ><span class="mono">{{ row.idCardNo }}</span></template
        >
      </el-table-column>
      <el-table-column label="审核" width="110">
        <template #default="{ row }">
          <StatusTag :status="row.auditStatus" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button v-if="userStore.has('admin:riders:manage')" link type="danger" @click="onToggle(row, 'disabled')"
            >禁用</el-button
          >
          <el-button v-if="userStore.has('admin:riders:manage')" link type="success" @click="onToggle(row, 'enabled')"
            >启用</el-button
          >
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
