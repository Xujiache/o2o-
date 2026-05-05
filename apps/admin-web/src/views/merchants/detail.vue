<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { type ApplicationDetailVo, getApplicationDetail } from '@/api/admin-merchants';
import { useUserStore } from '@/stores/user';

import AuditDialog from './components/AuditDialog.vue';
import LicensePreview from './components/LicensePreview.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const applicationId = String(route.params.id);
const detail = ref<ApplicationDetailVo | null>(null);
const loading = ref(false);
const dialogOpen = ref(false);

async function fetchDetail(): Promise<void> {
  loading.value = true;
  try {
    const r = await getApplicationDetail(applicationId);
    if (r.code === '0' && r.data) detail.value = r.data;
  } finally {
    loading.value = false;
  }
}

onMounted(fetchDetail);

function onAudit(): void {
  dialogOpen.value = true;
}

function onSubmitted(): void {
  void fetchDetail();
}
</script>

<template>
  <div class="merchant-detail" v-loading="loading">
    <el-page-header @back="router.back()" :content="`申请 ${applicationId}`" />

    <el-card v-if="detail" class="detail-card">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="申请 ID">{{ detail.applicationId }}</el-descriptions-item>
        <el-descriptions-item label="商家 ID">{{ detail.merchantId }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ detail.mobileMasked }}</el-descriptions-item>
        <el-descriptions-item label="店铺名">{{ detail.storeName }}</el-descriptions-item>
        <el-descriptions-item label="经营范围">{{ detail.businessScope }}</el-descriptions-item>
        <el-descriptions-item label="审核状态">
          <el-tag
            :type="
              detail.auditStatus === 'approved' ? 'success' : detail.auditStatus === 'rejected' ? 'danger' : 'warning'
            "
          >
            {{ detail.auditStatus }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="法人(脱敏)">{{ detail.legalPersonMasked }}</el-descriptions-item>
        <el-descriptions-item label="身份证(脱敏)">{{ detail.idCardMasked }}</el-descriptions-item>
        <el-descriptions-item label="营业执照(脱敏)">{{ detail.licenseNoMasked }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.foodPermitNoMasked" label="食品许可证(脱敏)">{{
          detail.foodPermitNoMasked
        }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.commissionRate" label="佣金率">{{
          detail.commissionRate
        }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.rejectReason" label="驳回原因">{{
          detail.rejectReason
        }}</el-descriptions-item>
      </el-descriptions>

      <div class="detail-card__actions">
        <el-button
          v-if="userStore.has('admin:merchants:manage') && detail.auditStatus === 'pending'"
          type="primary"
          @click="onAudit"
          >审核</el-button
        >
      </div>

      <el-divider content-position="left">资质文件</el-divider>
      <LicensePreview :licenses="detail.licenses" />
    </el-card>

    <AuditDialog v-model="dialogOpen" :application-id="applicationId" @submitted="onSubmitted" />
  </div>
</template>

<style scoped>
.merchant-detail {
  padding: 16px;
}
.detail-card {
  margin-top: 16px;
}
.detail-card__actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
