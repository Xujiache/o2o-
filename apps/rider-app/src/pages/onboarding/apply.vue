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
    <view class="apply__title">入驻第 1 步:身份资料</view>
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
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.apply__title {
  font-size: 36rpx;
  font-weight: 600;
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
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
.apply__btn[disabled] {
  background: #aac4ff;
}
</style>
