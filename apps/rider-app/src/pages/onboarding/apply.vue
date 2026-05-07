<script setup lang="ts">
import { computed, ref } from 'vue';

import IdCardInput from '@/components/common/IdCardInput.vue';
import UploadField from '@/components/common/UploadField.vue';

interface DraftRow {
  realName: string;
  idCardNo: string;
  idCardFrontFileId: string;
  idCardBackFileId: string;
}

const DRAFT_KEY = 'o2o:rider:onboarding:draft';

function readDraft(): Partial<DraftRow> {
  try {
    const raw = uni.getStorageSync(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as DraftRow) : {};
  } catch {
    return {};
  }
}

const draft = readDraft();
const realName = ref(draft.realName ?? '');
const idCardNo = ref(draft.idCardNo ?? '');
const idCardFrontFileId = ref(draft.idCardFrontFileId ?? '');
const idCardBackFileId = ref(draft.idCardBackFileId ?? '');

const valid = computed(
  () =>
    realName.value.trim().length >= 2 &&
    /^\d{17}[\dXx]$/.test(idCardNo.value) &&
    idCardFrontFileId.value &&
    idCardBackFileId.value,
);

function next(): void {
  if (!valid.value) return;
  const newDraft: DraftRow = {
    realName: realName.value,
    idCardNo: idCardNo.value,
    idCardFrontFileId: idCardFrontFileId.value,
    idCardBackFileId: idCardBackFileId.value,
  };
  uni.setStorageSync(DRAFT_KEY, JSON.stringify({ ...draft, ...newDraft }));
  uni.navigateTo({ url: '/pages/onboarding/face' });
}
</script>

<template>
  <view class="apply">
    <view class="apply__hero">
      <text class="apply__title">骑手入驻</text>
      <text class="apply__sub">第 1 步：提交身份资料，完成后继续人脸与资质核验</text>
    </view>
    <view class="apply__field">
      <text class="apply__label">真实姓名</text>
      <input class="apply__input" v-model="realName" placeholder="与身份证一致" maxlength="50" />
    </view>
    <view class="apply__field">
      <text class="apply__label">身份证号</text>
      <IdCardInput v-model="idCardNo" />
    </view>
    <UploadField v-model="idCardFrontFileId" label="身份证人像面" biz-type="rider-realname" />
    <UploadField v-model="idCardBackFileId" label="身份证国徽面" biz-type="rider-realname" />
    <button class="apply__btn" :disabled="!valid" @click="next">下一步:人脸核验</button>
  </view>
</template>

<style scoped>
.apply {
  padding: 28rpx 24rpx 56rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.apply__hero {
  padding: 34rpx;
  border-radius: 34rpx;
  color: #fff;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  box-shadow: 0 24rpx 64rpx rgba(20, 184, 166, 0.26);
}
.apply__title {
  display: block;
  font-size: 42rpx;
  font-weight: 800;
}
.apply__sub {
  display: block;
  margin-top: 8rpx;
  color: rgba(255, 255, 255, 0.76);
  font-size: 24rpx;
}
.apply__label {
  font-size: 26rpx;
  color: #666;
}
.apply__input {
  border-bottom: 1rpx solid #ddd;
  padding: 24rpx 0;
  font-size: 32rpx;
}
.apply__btn {
  margin-top: 32rpx;
  background: linear-gradient(135deg, #14b8a6, #0f766e);
  color: #fff;
  border-radius: 999rpx;
  font-weight: 700;
}
.apply__btn[disabled] {
  background: #9de3dc;
}
</style>
