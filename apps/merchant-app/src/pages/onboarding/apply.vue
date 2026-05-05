<script setup lang="ts">
import { computed, ref } from 'vue';

import { submitApplication, type SubmitApplicationReq } from '@/api';
import MobileInput from '@/components/common/MobileInput.vue';
import SmsCodeInput from '@/components/common/SmsCodeInput.vue';
import UploadField from '@/components/common/UploadField.vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

const form = ref<SubmitApplicationReq>({
  mobile: '',
  smsCode: '',
  licenseFileId: '',
  foodPermitFileId: '',
  idCardFrontFileId: '',
  idCardBackFileId: '',
  storePhotoFileIds: [],
  legalPerson: '',
  idCardNo: '',
  licenseNo: '',
  foodPermitNo: '',
  storeName: '',
  businessScope: '',
});
const storePhotoFile1 = ref('');
const submitting = ref(false);
const errorMsg = ref('');
const okMsg = ref('');

const canSubmit = computed(
  () =>
    /^1[3-9]\d{9}$/.test(form.value.mobile) &&
    /^\d{6}$/.test(form.value.smsCode) &&
    form.value.licenseFileId &&
    form.value.idCardFrontFileId &&
    form.value.idCardBackFileId &&
    storePhotoFile1.value &&
    form.value.legalPerson.length >= 2 &&
    /^\d{17}[\dXx]$/.test(form.value.idCardNo) &&
    form.value.licenseNo.length >= 15 &&
    form.value.storeName.length >= 1 &&
    form.value.businessScope.length >= 1 &&
    !submitting.value,
);

async function onSendSms(): Promise<void> {
  if (!/^1[3-9]\d{9}$/.test(form.value.mobile)) return;
  try {
    await auth.sendSms(form.value.mobile);
    okMsg.value = '验证码已发送';
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '发送失败';
  }
}

async function onSubmit(): Promise<void> {
  if (!canSubmit.value) return;
  errorMsg.value = '';
  okMsg.value = '';
  submitting.value = true;
  try {
    const body: SubmitApplicationReq = {
      ...form.value,
      storePhotoFileIds: [storePhotoFile1.value],
    };
    if (!body.foodPermitFileId) body.foodPermitFileId = undefined;
    if (!body.foodPermitNo) body.foodPermitNo = undefined;
    const r = await submitApplication(body);
    if (r.code !== '0' || !r.data) {
      errorMsg.value = r.message || '提交失败';
      return;
    }
    okMsg.value = `已提交,申请号:${r.data.applicationId}`;
    setTimeout(() => uni.reLaunch({ url: '/pages/login/index' }), 1500);
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '提交失败';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="apply">
    <view class="apply__title">商家入驻申请</view>

    <text class="apply__sect">手机号 + 验证码</text>
    <MobileInput v-model="form.mobile" />
    <view class="apply__sms-row">
      <SmsCodeInput v-model="form.smsCode" />
      <button class="apply__sms-btn" @click="onSendSms">获取验证码</button>
    </view>

    <text class="apply__sect">资质文件</text>
    <UploadField v-model="form.licenseFileId" label="营业执照" biz-type="merchant-license" />
    <UploadField v-model="form.foodPermitFileId" label="食品许可证(可选)" biz-type="merchant-food-permit" />
    <UploadField v-model="form.idCardFrontFileId" label="法人身份证(正面)" biz-type="merchant-legal" />
    <UploadField v-model="form.idCardBackFileId" label="法人身份证(背面)" biz-type="merchant-legal" />
    <UploadField v-model="storePhotoFile1" label="门店实拍图(至少 1 张)" biz-type="store-photo" />

    <text class="apply__sect">基本信息</text>
    <input class="apply__field" placeholder="法人姓名" v-model="form.legalPerson" maxlength="50" />
    <input class="apply__field" placeholder="法人身份证号" v-model="form.idCardNo" maxlength="18" />
    <input class="apply__field" placeholder="营业执照号" v-model="form.licenseNo" maxlength="30" />
    <input class="apply__field" placeholder="食品许可证号(可选)" v-model="form.foodPermitNo" maxlength="40" />
    <input class="apply__field" placeholder="店铺名称" v-model="form.storeName" maxlength="128" />
    <input class="apply__field" placeholder="经营范围(中餐/便利店等)" v-model="form.businessScope" maxlength="64" />

    <button class="apply__submit" :disabled="!canSubmit" @click="onSubmit">
      {{ submitting ? '提交中...' : '提交申请' }}
    </button>

    <text v-if="okMsg" class="apply__ok">{{ okMsg }}</text>
    <text v-if="errorMsg" class="apply__error">{{ errorMsg }}</text>
  </view>
</template>

<style scoped>
.apply {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.apply__title {
  font-size: 40rpx;
  font-weight: 600;
}
.apply__sect {
  font-size: 26rpx;
  color: #888;
  margin-top: 24rpx;
}
.apply__sms-row {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
}
.apply__sms-btn {
  flex-shrink: 0;
  background: #4c84ff;
  color: #fff;
  font-size: 24rpx;
  padding: 12rpx 24rpx;
  border-radius: 12rpx;
}
.apply__field {
  font-size: 30rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #ddd;
}
.apply__submit {
  margin-top: 48rpx;
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
.apply__submit[disabled] {
  background: #c5d4ff;
}
.apply__ok {
  color: #52c41a;
  font-size: 26rpx;
}
.apply__error {
  color: #ff4d4f;
  font-size: 26rpx;
}
</style>
