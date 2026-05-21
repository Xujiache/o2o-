<script setup lang="ts">
import { computed, ref } from 'vue';

import { submitOnboardingApplication, type CertItem, type CertType, type VehicleType } from '@/api';
import UploadField from '@/components/common/UploadField.vue';

const DRAFT_KEY = 'o2o:rider:onboarding:draft';

interface Draft {
  realName?: string;
  idCardNo?: string;
  idCardFrontFileId?: string;
  idCardBackFileId?: string;
  faceFileId?: string;
  healthCertNo?: string;
  healthCertExpiryDate?: string;
  healthCertFileId?: string;
  vehicleType?: VehicleType;
  plateNo?: string;
  brand?: string;
  driverLicenseFileId?: string;
  vehicleLicenseFileId?: string;
}

const VEHICLE_OPTIONS: Array<{ label: string; value: VehicleType }> = [
  { label: '电动车', value: 'electric_bike' },
  { label: '摩托车', value: 'motorcycle' },
  { label: '汽车', value: 'car' },
];

const draft: Draft = JSON.parse(uni.getStorageSync(DRAFT_KEY) || '{}');
const vehicleType = ref<VehicleType>(draft.vehicleType ?? 'electric_bike');
const plateNo = ref(draft.plateNo ?? '');
const brand = ref(draft.brand ?? '');
const driverLicenseFileId = ref(draft.driverLicenseFileId ?? '');
const vehicleLicenseFileId = ref(draft.vehicleLicenseFileId ?? '');
const submitting = ref(false);

const valid = computed(() => Boolean(driverLicenseFileId.value));

async function onSubmit(): Promise<void> {
  if (!valid.value || submitting.value) return;
  if (!draft.realName || !draft.idCardNo || !draft.healthCertNo || !draft.faceFileId) {
    uni.showToast({ icon: 'none', title: '请先完成前面步骤' });
    return;
  }
  submitting.value = true;
  try {
    const expiryMs = draft.healthCertExpiryDate ? new Date(draft.healthCertExpiryDate).getTime() : 0;
    if (!expiryMs) {
      uni.showToast({ icon: 'none', title: '健康证到期日期格式错误' });
      return;
    }
    const certificates: CertItem[] = [
      { certType: 'id_card_front' as CertType, fileObjectId: draft.idCardFrontFileId! },
      { certType: 'id_card_back' as CertType, fileObjectId: draft.idCardBackFileId! },
      { certType: 'face_video' as CertType, fileObjectId: draft.faceFileId },
      { certType: 'health_cert' as CertType, fileObjectId: draft.healthCertFileId! },
      { certType: 'driver_license' as CertType, fileObjectId: driverLicenseFileId.value },
    ];
    if (vehicleLicenseFileId.value) {
      certificates.push({ certType: 'vehicle_license' as CertType, fileObjectId: vehicleLicenseFileId.value });
    }
    const r = await submitOnboardingApplication({
      realName: draft.realName,
      idCardNo: draft.idCardNo,
      healthCertNo: draft.healthCertNo,
      healthCertExpiry: expiryMs,
      vehicle: { vehicleType: vehicleType.value, plateNo: plateNo.value, brand: brand.value },
      certificates,
    });
    if (r.code !== '0' || !r.data) {
      uni.showToast({ icon: 'none', title: r.message || '提交失败' });
      return;
    }
    uni.removeStorageSync(DRAFT_KEY);
    uni.showToast({ icon: 'success', title: '提交成功' });
    setTimeout(() => uni.reLaunch({ url: '/pages/onboarding/progress' }), 600);
  } catch (e) {
    uni.showToast({ icon: 'none', title: e instanceof Error ? e.message : '提交失败' });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="vehicle">
    <view class="vehicle__title">入驻第 4 步:车辆信息</view>
    <view class="vehicle__field">
      <text class="vehicle__label">车辆类型</text>
      <view class="vehicle__radios">
        <view
          v-for="opt in VEHICLE_OPTIONS"
          :key="opt.value"
          class="vehicle__radio"
          :class="{ 'vehicle__radio--active': vehicleType === opt.value }"
          @click="vehicleType = opt.value"
        >
          {{ opt.label }}
        </view>
      </view>
    </view>
    <view class="vehicle__field">
      <text class="vehicle__label">车牌号(选填)</text>
      <input class="vehicle__input" v-model="plateNo" placeholder="京A12345" maxlength="20" />
    </view>
    <view class="vehicle__field">
      <text class="vehicle__label">品牌(选填)</text>
      <input class="vehicle__input" v-model="brand" placeholder="雅迪 / 爱玛..." maxlength="50" />
    </view>
    <UploadField v-model="driverLicenseFileId" label="驾驶证(必填)" biz-type="rider-realname" />
    <UploadField v-model="vehicleLicenseFileId" label="行驶证(选填,机动车)" biz-type="rider-realname" />
    <button class="vehicle__btn" :disabled="!valid || submitting" @click="onSubmit">
      {{ submitting ? '提交中...' : '提交入驻' }}
    </button>
  </view>
</template>

<style scoped>
.vehicle {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.vehicle__title {
  font-size: 36rpx;
  font-weight: 600;
}
.vehicle__label {
  font-size: 26rpx;
  color: #666;
}
.vehicle__input {
  border-bottom: 1rpx solid #ddd;
  padding: 24rpx 0;
  font-size: 32rpx;
}
.vehicle__radios {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}
.vehicle__radio {
  padding: 12rpx 24rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333;
}
.vehicle__radio--active {
  border-color: var(--brand-primary);
  color: var(--brand-primary);
}
.vehicle__btn {
  margin-top: 32rpx;
  background: var(--brand-primary);
  color: #fff;
  border-radius: 12rpx;
}
.vehicle__btn[disabled] {
  background: var(--brand-primary-light);
}
</style>
