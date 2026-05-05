<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import { type BusinessStatus, listStores, setStoreBusinessStatus, type StoreItemVo } from '@/api/admin-merchants';
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

onMounted(fetchList);

async function onForceStatus(row: StoreItemVo, target: BusinessStatus): Promise<void> {
  try {
    const reasonRes = await ElMessageBox.prompt(`确认强制将店铺 ${row.name} 状态改为 ${target}?`, '强制管控', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputPlaceholder: '操作原因(必填)',
    });
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
</script>

<template>
  <div class="stores">
    <el-card>
      <el-form :model="query" :inline="true">
        <el-form-item label="状态">
          <el-select
            v-model="query.businessStatus"
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
            <el-option label="营业中" value="online" />
            <el-option label="休业" value="offline" />
            <el-option label="平台暂停" value="paused" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="店铺 ID" prop="storeId" width="120" />
        <el-table-column label="商家 ID" prop="merchantId" width="100" />
        <el-table-column label="店铺名" prop="name" />
        <el-table-column label="状态" prop="businessStatus" width="120">
          <template #default="{ row }">
            <el-tag
              :type="row.businessStatus === 'online' ? 'success' : row.businessStatus === 'paused' ? 'danger' : 'info'"
            >
              {{ row.businessStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="佣金率" prop="commissionRate" width="120" />
        <el-table-column label="操作" width="200" fixed="right">
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
      </el-table>

      <div class="stores__pagination">
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
.stores {
  padding: 16px;
}
.stores__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
