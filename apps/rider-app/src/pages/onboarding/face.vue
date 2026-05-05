<script setup lang="ts">
import { computed, ref } from 'vue';

import UploadField from '@/components/common/UploadField.vue';

const DRAFT_KEY = 'o2o:rider:onboarding:draft';

interface Draft {
  faceFileId?: string;
}

const draft: Draft = JSON.parse(uni.getStorageSync(DRAFT_KEY) || '{}');
const faceFileId = ref(draft.faceFileId ?? '');

const valid = computed(() => Boolean(faceFileId.value));

function next(): void {
  if (!valid.value) return;
  uni.setStorageSync(DRAFT_KEY, JSON.stringify({ ...draft, faceFileId: faceFileId.value }));
  uni.navigateTo({ url: '/pages/onboarding/health' });
}
</script>

<template>
  <view class="face">
    <view class="face__title">入驻第 2 步:人脸核验</view>
    <view class="face__desc">上传清晰人脸视频或正面照片(供平台核验身份)</view>
    <UploadField v-model="faceFileId" label="人脸视频/照片" biz-type="rider-realname" />
    <button class="face__btn" :disabled="!valid" @click="next">下一步:健康证</button>
  </view>
</template>

<style scoped>
.face {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.face__title {
  font-size: 36rpx;
  font-weight: 600;
}
.face__desc {
  font-size: 26rpx;
  color: #666;
}
.face__btn {
  margin-top: 32rpx;
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
.face__btn[disabled] {
  background: #aac4ff;
}
</style>
