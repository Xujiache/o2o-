<script setup lang="ts">
import { computed, ref } from 'vue';

import UploadField from '@/components/common/UploadField.vue';

const DRAFT_KEY = 'o2o:rider:onboarding:draft';

interface Draft {
  healthCertNo?: string;
  healthCertExpiryDate?: string;
  healthCertFileId?: string;
}

const draft: Draft = JSON.parse(uni.getStorageSync(DRAFT_KEY) || '{}');
const healthCertNo = ref(draft.healthCertNo ?? '');
const healthCertExpiryDate = ref(draft.healthCertExpiryDate ?? '');
const healthCertFileId = ref(draft.healthCertFileId ?? '');

const valid = computed(() => healthCertNo.value.length >= 5 && healthCertExpiryDate.value && healthCertFileId.value);

function next(): void {
  if (!valid.value) return;
  uni.setStorageSync(
    DRAFT_KEY,
    JSON.stringify({
      ...draft,
      healthCertNo: healthCertNo.value,
      healthCertExpiryDate: healthCertExpiryDate.value,
      healthCertFileId: healthCertFileId.value,
    }),
  );
  uni.navigateTo({ url: '/pages/onboarding/vehicle' });
}
</script>

<template>
  <view class="health">
    <view class="health__title">入驻第 3 步:健康证</view>
    <view class="health__field">
      <text class="health__label">健康证号</text>
      <input class="health__input" v-model="healthCertNo" placeholder="输入健康证编号" maxlength="50" />
    </view>
    <view class="health__field">
      <text class="health__label">到期日期(YYYY-MM-DD)</text>
      <input class="health__input" v-model="healthCertExpiryDate" placeholder="2027-01-01" maxlength="10" />
    </view>
    <UploadField v-model="healthCertFileId" label="健康证照片" biz-type="rider-health" />
    <button class="health__btn" :disabled="!valid" @click="next">下一步:车辆信息</button>
  </view>
</template>

<style scoped>
.health {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.health__title {
  font-size: 36rpx;
  font-weight: 600;
}
.health__label {
  font-size: 26rpx;
  color: #666;
}
.health__input {
  border-bottom: 1rpx solid #ddd;
  padding: 24rpx 0;
  font-size: 32rpx;
}
.health__btn {
  margin-top: 32rpx;
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
.health__btn[disabled] {
  background: #aac4ff;
}
</style>
