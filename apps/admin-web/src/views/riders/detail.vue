<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { getRiderDetail, type RiderDetailVo } from '@/api/admin-riders';
import { useUserStore } from '@/stores/user';

import RiderAuditDialog from './components/RiderAuditDialog.vue';
import RiderHealthCertPreview from './components/RiderHealthCertPreview.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const applicationId = String(route.params.id);
const detail = ref<RiderDetailVo | null>(null);
const loading = ref(false);
const dialogOpen = ref(false);

async function fetchDetail(): Promise<void> {
  loading.value = true;
  try {
    const r = await getRiderDetail(applicationId);
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
  <div class="rider-detail" v-loading="loading">
    <el-page-header @back="router.back()" :content="`申请 ${applicationId}`" />

    <el-card v-if="detail" class="detail-card">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="申请 ID">{{ detail.applicationId }}</el-descriptions-item>
        <el-descriptions-item label="骑手 ID">{{ detail.riderId ?? '—' }}</el-descriptions-item>
        <el-descriptions-item label="手机号(脱敏)">{{ detail.mobile }}</el-descriptions-item>
        <el-descriptions-item label="姓名(脱敏)">{{ detail.realName }}</el-descriptions-item>
        <el-descriptions-item label="身份证(脱敏)">{{ detail.idCardNo }}</el-descriptions-item>
        <el-descriptions-item label="健康证号(脱敏)">{{ detail.healthCertNo }}</el-descriptions-item>
        <el-descriptions-item label="健康证到期">
          {{ new Date(Number(detail.healthCertExpiry)).toLocaleDateString() }}
        </el-descriptions-item>
        <el-descriptions-item label="审核状态">
          <el-tag
            :type="
              detail.auditStatus === 'approved' ? 'success' : detail.auditStatus === 'rejected' ? 'danger' : 'warning'
            "
          >
            {{ detail.auditStatus }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="detail.accountStatus" label="账号状态">{{
          detail.accountStatus
        }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.onlineStatus" label="在线状态">{{
          detail.onlineStatus
        }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.vehicleType" label="车辆类型">{{ detail.vehicleType }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.plateNo" label="车牌">{{ detail.plateNo }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.rejectReason" label="驳回原因">{{
          detail.rejectReason
        }}</el-descriptions-item>
      </el-descriptions>

      <div class="detail-card__actions">
        <el-button
          v-if="userStore.has('admin:riders:manage') && detail.auditStatus === 'pending'"
          type="primary"
          @click="onAudit"
          >审核</el-button
        >
      </div>

      <el-divider content-position="left">资质文件</el-divider>
      <RiderHealthCertPreview :certificates="detail.certificates" />
    </el-card>

    <RiderAuditDialog v-model="dialogOpen" :application-id="applicationId" @submitted="onSubmitted" />
  </div>
</template>

<style scoped>
.rider-detail {
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
