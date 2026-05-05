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

onMounted(fetchList);

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
</script>

<template>
  <div class="rider-status">
    <el-card>
      <el-form :model="query" :inline="true">
        <el-form-item label="账号状态">
          <el-select
            v-model="query.accountStatus"
            placeholder="全部"
            clearable
            style="width: 140px"
            @change="
              () => {
                query.pageNo = 1;
                void fetchList();
              }
            "
          >
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="disabled" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="骑手 ID" prop="riderId" width="100" />
        <el-table-column label="手机号" prop="mobile" width="140" />
        <el-table-column label="姓名" prop="realName" width="140" />
        <el-table-column label="身份证" prop="idCardNo" width="200" />
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
      </el-table>

      <div class="rider-status__pagination">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="total"
          :current-page="query.pageNo"
          :page-size="query.pageSize"
          @current-change="
            (p: number) => {
              query.pageNo = p;
              void fetchList();
            }
          "
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.rider-status {
  padding: 16px;
}
.rider-status__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
