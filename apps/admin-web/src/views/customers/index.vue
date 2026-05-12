<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { type AccountStatus, type CustomerListItemVo, listCustomers, type RealnameStatus } from '@/api/admin-customers';
import { disableCustomer, enableCustomer } from '@/api/admin-customer-disable';
import DataTable from '@/components/DataTable.vue';
import FilterBar from '@/components/FilterBar.vue';
import PageContainer from '@/components/PageContainer.vue';
import StatusTag from '@/components/StatusTag.vue';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();
const loading = ref(false);
const list = ref<CustomerListItemVo[]>([]);
const total = ref(0);
const canManage = (): boolean => userStore.has('admin:customers:disable');

const REALNAME_LABEL: Record<string, string> = {
  unverified: '未实名',
  pending: '审核中',
  verified: '已实名',
  failed: '失败',
};

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

async function onDisable(row: CustomerListItemVo): Promise<void> {
  try {
    const { value: reason } = await ElMessageBox.prompt('请输入禁用原因(1-500 字符)', `禁用 ${row.userId}`, {
      confirmButtonText: '确认禁用',
      cancelButtonText: '取消',
      inputValidator: (val) => (val && val.length >= 1 && val.length <= 500) || '原因长度 1-500 字符',
    });
    if (!reason) return;
    const r = await disableCustomer(row.userId, reason);
    if (r.code === '0') {
      ElMessage.success('已禁用');
      await fetchList();
    }
  } catch {
    /* user cancel */
  }
}

async function onEnable(row: CustomerListItemVo): Promise<void> {
  try {
    const { value: reason } = await ElMessageBox.prompt('请输入解禁原因(1-500 字符)', `启用 ${row.userId}`, {
      confirmButtonText: '确认启用',
      cancelButtonText: '取消',
      inputValidator: (val) => (val && val.length >= 1 && val.length <= 500) || '原因长度 1-500 字符',
    });
    if (!reason) return;
    const r = await enableCustomer(row.userId, reason);
    if (r.code === '0') {
      ElMessage.success('已启用');
      await fetchList();
    }
  } catch {
    /* user cancel */
  }
}

function viewDisableRecords(): void {
  router.push('/admin/customers/disable-records');
}

onMounted(fetchList);
</script>

<template>
  <PageContainer title="用户管理" subtitle="C 端用户列表 · 实名与账号状态">
    <template #extra>
      <el-button v-if="canManage()" @click="viewDisableRecords">禁用记录</el-button>
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
          placeholder="userId / 手机号"
          clearable
          style="width: 200px"
          @keyup.enter="onSearch"
        />
      </div>
      <div class="filter-field">
        <label>实名状态</label>
        <el-select v-model="query.realnameStatus" placeholder="全部" clearable style="width: 140px">
          <el-option label="未实名" value="unverified" />
          <el-option label="审核中" value="pending" />
          <el-option label="已实名" value="verified" />
          <el-option label="失败" value="failed" />
        </el-select>
      </div>
      <div class="filter-field">
        <label>账号状态</label>
        <el-select v-model="query.accountStatus" placeholder="全部" clearable style="width: 140px">
          <el-option label="正常" value="active" />
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
      <el-table-column label="用户 ID" prop="userId" width="140">
        <template #default="{ row }"
          ><span class="mono">{{ row.userId }}</span></template
        >
      </el-table-column>
      <el-table-column label="手机号" prop="mobileMasked" width="150">
        <template #default="{ row }"
          ><span class="mono">{{ row.mobileMasked }}</span></template
        >
      </el-table-column>
      <el-table-column label="昵称" prop="nickname" />
      <el-table-column label="实名状态" width="120">
        <template #default="{ row }">
          <StatusTag :status="row.realnameStatus" :label="REALNAME_LABEL[row.realnameStatus] ?? row.realnameStatus" />
        </template>
      </el-table-column>
      <el-table-column label="账号状态" width="110">
        <template #default="{ row }">
          <StatusTag :status="row.accountStatus" :label="row.accountStatus === 'disabled' ? '已禁用' : '正常'" />
        </template>
      </el-table-column>
      <el-table-column label="注册时间" prop="registeredAt" width="180">
        <template #default="{ row }"
          ><span class="muted">{{ row.registeredAt }}</span></template
        >
      </el-table-column>
      <el-table-column label="最近登录" prop="lastLoginAt" width="180">
        <template #default="{ row }"
          ><span class="muted">{{ row.lastLoginAt }}</span></template
        >
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewDetail(row)">详情</el-button>
          <el-button v-if="canManage() && row.accountStatus === 'active'" link type="danger" @click="onDisable(row)">
            禁用
          </el-button>
          <el-button v-if="canManage() && row.accountStatus === 'disabled'" link type="success" @click="onEnable(row)">
            启用
          </el-button>
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
