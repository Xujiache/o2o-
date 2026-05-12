<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';

import { type BusinessStatus, listStores, setStoreBusinessStatus, type StoreItemVo } from '@/api/admin-merchants';

import DataTable from '@/components/DataTable.vue';
import FilterBar from '@/components/FilterBar.vue';
import PageContainer from '@/components/PageContainer.vue';
import StatusTag from '@/components/StatusTag.vue';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const loading = ref(false);
const list = ref<StoreItemVo[]>([]);
const total = ref(0);

const query = reactive<{
  businessStatus: BusinessStatus | '';
  pageNo: number;
  pageSize: number;
}>({
  businessStatus: '',
  pageNo: 1,
  pageSize: 20,
});

const STATUS_LABEL: Record<BusinessStatus, string> = {
  online: '营业中',
  offline: '休业',
  paused: '平台暂停',
};

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const r = await listStores({
      businessStatus: query.businessStatus || undefined,
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
  query.businessStatus = '';
  query.pageNo = 1;
  void fetchList();
}

async function onForceStatus(row: StoreItemVo, target: BusinessStatus): Promise<void> {
  try {
    const reasonRes = await ElMessageBox.prompt(
      `确认强制将店铺 ${row.name} 状态改为 ${STATUS_LABEL[target]}?`,
      '强制管控',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        inputPlaceholder: '操作原因(必填)',
      },
    );
    if (!reasonRes.value?.trim()) {
      ElMessage.warning('请填写原因');
      return;
    }
    const r = await setStoreBusinessStatus(row.storeId, { businessStatus: target, reason: reasonRes.value.trim() });
    if (r.code === '0') {
      ElMessage.success('已生效');
      void fetchList();
    } else {
      ElMessage.error(r.message || '操作失败');
    }
  } catch {
    /* 用户取消 */
  }
}

const tone = (s: BusinessStatus): 'success' | 'neutral' | 'danger' =>
  s === 'online' ? 'success' : s === 'paused' ? 'danger' : 'neutral';

onMounted(fetchList);
</script>

<template>
  <PageContainer title="店铺管控" subtitle="审核通过商家的运营状态管理">
    <template #extra>
      <el-button @click="fetchList">
        <el-icon><Refresh /></el-icon>
        <span style="margin-left: 6px">刷新</span>
      </el-button>
    </template>

    <FilterBar @search="onSearch" @reset="onReset">
      <div class="filter-field">
        <label>营业状态</label>
        <el-select v-model="query.businessStatus" placeholder="全部" clearable style="width: 160px">
          <el-option label="营业中" value="online" />
          <el-option label="休业" value="offline" />
          <el-option label="平台暂停" value="paused" />
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
      <el-table-column label="店铺 ID" prop="storeId" width="140">
        <template #default="{ row }"
          ><span class="mono">{{ row.storeId }}</span></template
        >
      </el-table-column>
      <el-table-column label="商家 ID" prop="merchantId" width="120">
        <template #default="{ row }"
          ><span class="mono">{{ row.merchantId }}</span></template
        >
      </el-table-column>
      <el-table-column label="店铺名" prop="name" min-width="180" show-overflow-tooltip />
      <el-table-column label="状态" width="130">
        <template #default="{ row }">
          <StatusTag
            :status="row.businessStatus"
            :label="STATUS_LABEL[row.businessStatus as BusinessStatus] || row.businessStatus"
            :tone="tone(row.businessStatus)"
          />
        </template>
      </el-table-column>
      <el-table-column label="佣金率" prop="commissionRate" width="100" align="right">
        <template #default="{ row }">
          <span v-if="row.commissionRate" class="mono">{{ row.commissionRate }}</span>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="userStore.has('admin:merchants:manage') && row.businessStatus !== 'paused'"
            link
            type="danger"
            @click="onForceStatus(row, 'paused')"
            >强制暂停</el-button
          >
          <el-button
            v-if="userStore.has('admin:merchants:manage') && row.businessStatus === 'paused'"
            link
            type="success"
            @click="onForceStatus(row, 'offline')"
            >解除暂停</el-button
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
