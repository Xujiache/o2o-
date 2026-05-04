<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { type CustomerDetailVo, getCustomerDetail } from '@/api/admin-customers';
import { useUserStore } from '@/stores/user';

import DisableDialog from './components/DisableDialog.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const userId = String(route.params.id);
const detail = ref<CustomerDetailVo | null>(null);
const loading = ref(false);

const dialogOpen = ref(false);
const dialogOperation = ref<'enable' | 'disable'>('disable');

async function fetchDetail(): Promise<void> {
  loading.value = true;
  try {
    const r = await getCustomerDetail(userId);
    if (r.code === '0' && r.data) {
      detail.value = r.data;
    }
  } finally {
    loading.value = false;
  }
}

function onToggleStatus(): void {
  dialogOperation.value = detail.value?.accountStatus === 'disabled' ? 'enable' : 'disable';
  dialogOpen.value = true;
}

function onDialogSubmitted(): void {
  void fetchDetail();
}

function viewRealname(): void {
  router.push(`/admin/customers/${userId}/realname`);
}

onMounted(fetchDetail);
</script>

<template>
  <div class="customer-detail" v-loading="loading">
    <el-page-header @back="router.back()" :content="`用户 ${userId}`" />

    <el-card v-if="detail" class="detail-card">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="用户 ID">{{ detail.userId }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ detail.mobileMasked }}</el-descriptions-item>
        <el-descriptions-item label="昵称">{{ detail.nickname }}</el-descriptions-item>
        <el-descriptions-item label="资料完整">{{ detail.profileCompleted ? '是' : '否' }}</el-descriptions-item>
        <el-descriptions-item label="实名状态">{{ detail.realnameStatus }}</el-descriptions-item>
        <el-descriptions-item label="账号状态">
          <el-tag :type="detail.accountStatus === 'disabled' ? 'danger' : 'success'">
            {{ detail.accountStatus === 'disabled' ? '已禁用' : '正常' }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <div class="detail-card__actions">
        <el-button @click="viewRealname">实名记录</el-button>
        <el-button
          v-if="userStore.has('admin:customers:disable')"
          :type="detail.accountStatus === 'disabled' ? 'success' : 'danger'"
          @click="onToggleStatus"
        >
          {{ detail.accountStatus === 'disabled' ? '启用' : '禁用' }}
        </el-button>
      </div>

      <el-divider content-position="left">最近登录设备</el-divider>
      <el-table :data="detail.recentDevices" stripe>
        <el-table-column label="设备 ID" prop="deviceId" />
        <el-table-column label="平台" prop="platform" width="120" />
        <el-table-column label="登录时间" prop="loginAt" width="180" />
        <el-table-column label="状态" prop="status" width="100" />
      </el-table>

      <el-divider content-position="left">风控标签</el-divider>
      <el-table v-if="detail.riskTags.length" :data="detail.riskTags" stripe>
        <el-table-column label="类型" prop="tagType" width="180" />
        <el-table-column label="原因" prop="reason" />
        <el-table-column label="创建时间" prop="createdAt" width="180" />
      </el-table>
      <el-empty v-else description="无风控标签" :image-size="48" />
    </el-card>

    <DisableDialog v-model="dialogOpen" :user-id="userId" :operation="dialogOperation" @submitted="onDialogSubmitted" />
  </div>
</template>

<style scoped>
.customer-detail {
  padding: 16px;
}
.detail-card {
  margin-top: 16px;
}
.detail-card__actions {
  margin-top: 16px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
