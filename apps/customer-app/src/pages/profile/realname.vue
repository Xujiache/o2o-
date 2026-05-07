<script setup lang="ts">
import { computed, ref } from 'vue';

import { realnameVerify, sendSmsCode } from '@/api';
import IdCardInput from '@/components/common/IdCardInput.vue';
import SmsCodeInput from '@/components/common/SmsCodeInput.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';

const realName = ref('');
const idCardNo = ref('');
const smsCode = ref('');
const smsRemaining = ref(0);
const submitting = ref(false);
const sending = ref(false);
const result = ref<{ status: 'success' | 'failed'; reason?: string; verifiedAt?: number } | null>(null);
const errorMsg = ref('');

let smsTimer: ReturnType<typeof setInterval> | null = null;

const canSubmit = computed(
  () =>
    realName.value.trim().length >= 2 &&
    /^\d{17}[\dX]$/.test(idCardNo.value) &&
    /^\d{6}$/.test(smsCode.value) &&
    !submitting.value,
);

async function onSendSms(): Promise<void> {
  if (smsRemaining.value > 0 || sending.value) return;
  // 实名场景使用当前用户的 mobile,后端不允许从请求传 — 这里前端仍需提示用户已绑定的手机号
  // 简化:直接调 sms-code 接口,scene=realname,mobile 由用户填(或从 profile 拿)
  // TASK 描述:mobile 来自 customer_user 表 — 真实 mobile 由后端取,前端只发 scene
  try {
    sending.value = true;
    // 后端 /sms-code 还是要 mobile + scene。在 realname 场景下,用户的 mobile 应该已知。
    // 简化方案:从 storage 读注册手机号(token 中没有 mobile);此处占位用 placeholder。
    // 真实情况:用户已登录,可以走单独的 /api/v1/c/sms-code/realname 之类不带 mobile 的接口
    const mobile = (uni.getStorageSync('o2o:customer:last-mobile') as string) || '';
    if (!mobile) {
      errorMsg.value = '未取到手机号,请重新登录';
      return;
    }
    const r = await sendSmsCode({ mobile, scene: 'realname' });
    if (r.code !== '0') {
      errorMsg.value = r.message;
      return;
    }
    smsRemaining.value = r.data?.expireSeconds ? Math.min(60, r.data.expireSeconds) : 60;
    if (smsTimer) clearInterval(smsTimer);
    smsTimer = setInterval(() => {
      smsRemaining.value--;
      if (smsRemaining.value <= 0 && smsTimer) {
        clearInterval(smsTimer);
        smsTimer = null;
      }
    }, 1000);
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '验证码发送失败';
  } finally {
    sending.value = false;
  }
}

async function onSubmit(): Promise<void> {
  if (!canSubmit.value) return;
  errorMsg.value = '';
  result.value = null;
  submitting.value = true;
  try {
    const r = await realnameVerify({
      realName: realName.value.trim(),
      idCardNo: idCardNo.value,
      smsCode: smsCode.value,
    });
    if (r.code !== '0' || !r.data) {
      errorMsg.value = r.message || '提交失败';
      return;
    }
    result.value = {
      status: r.data.verifyStatus,
      reason: r.data.failedReason,
      verifiedAt: r.data.verifiedAt,
    };
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '提交失败';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="realname">
    <view class="realname__title">实名认证</view>

    <view v-if="result?.status === 'success'" class="realname__alert realname__alert--ok">
      <SvgIcon name="check-circle" :size="32" color="#1e8e3e" />
      <text>认证成功</text>
      <text v-if="result.verifiedAt" class="realname__time">{{ new Date(result.verifiedAt).toLocaleString() }}</text>
    </view>
    <view v-else-if="result?.status === 'failed'" class="realname__alert realname__alert--fail">
      认证失败:{{ result.reason }}
    </view>

    <text class="realname__label">姓名</text>
    <input class="realname__field" type="text" placeholder="请输入真实姓名" v-model="realName" maxlength="50" />

    <text class="realname__label">身份证号</text>
    <IdCardInput v-model="idCardNo" />

    <text class="realname__label">短信验证码</text>
    <view class="realname__sms-row">
      <SmsCodeInput v-model="smsCode" />
      <button class="realname__sms-btn" :disabled="smsRemaining > 0 || sending" @click="onSendSms">
        {{ smsRemaining > 0 ? `${smsRemaining}s` : '获取验证码' }}
      </button>
    </view>

    <button class="realname__submit" :disabled="!canSubmit" @click="onSubmit">
      {{ submitting ? '提交中...' : '提交认证' }}
    </button>

    <text v-if="errorMsg" class="realname__error">{{ errorMsg }}</text>
  </view>
</template>

<style scoped>
.realname {
  padding: 48rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.realname__title {
  font-size: 40rpx;
  font-weight: 600;
}
.realname__label {
  font-size: 26rpx;
  color: #666;
  margin-top: 24rpx;
}
.realname__field {
  font-size: 32rpx;
  border-bottom: 1rpx solid #ddd;
  padding: 24rpx 0;
}
.realname__sms-row {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
}
.realname__sms-btn {
  flex-shrink: 0;
  background: #4c84ff;
  color: #fff;
  font-size: 26rpx;
  padding: 12rpx 24rpx;
  border-radius: 12rpx;
}
.realname__sms-btn[disabled] {
  background: #c5d4ff;
}
.realname__submit {
  margin-top: 48rpx;
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
.realname__submit[disabled] {
  background: #c5d4ff;
}
.realname__alert {
  padding: 24rpx;
  border-radius: 12rpx;
  font-size: 26rpx;
}
.realname__alert--ok {
  background: #f0fff4;
  color: #52c41a;
  border: 1rpx solid #b7eb8f;
}
.realname__alert--fail {
  background: #fff1f0;
  color: #ff4d4f;
  border: 1rpx solid #ffa39e;
}
.realname__time {
  display: block;
  font-size: 22rpx;
  color: #888;
}
.realname__error {
  color: #ff4d4f;
  font-size: 26rpx;
  margin-top: 16rpx;
}
</style>
