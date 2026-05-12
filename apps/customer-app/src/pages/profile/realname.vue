<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';

import { realnameVerify, sendSmsCode } from '@/api';
import IdCardInput from '@/components/common/IdCardInput.vue';
import SmsCodeInput from '@/components/common/SmsCodeInput.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { useAuthStore } from '@/stores/auth';
import { maskPhone } from '@/utils/format';

const auth = useAuthStore();
const realName = ref('');
const idCardNo = ref('');
const smsCode = ref('');
const smsRemaining = ref(0);
const submitting = ref(false);
const sending = ref(false);
const result = ref<{ status: 'success' | 'failed'; reason?: string; verifiedAt?: number } | null>(null);
const errorMsg = ref('');

let smsTimer: ReturnType<typeof setInterval> | null = null;

const nameValid = computed(() => realName.value.trim().length >= 2);
const idValid = computed(() => /^\d{17}[\dX]$/.test(idCardNo.value));
const smsValid = computed(() => /^\d{6}$/.test(smsCode.value));

const stepStatus = computed(() => ({
  name: nameValid.value,
  id: idValid.value,
  sms: smsValid.value,
}));

const completedSteps = computed(() => Object.values(stepStatus.value).filter(Boolean).length);
const canSubmit = computed(() => nameValid.value && idValid.value && smsValid.value && !submitting.value);

const maskedMobile = computed<string>(() => {
  const mobile = auth.mobile || (uni.getStorageSync('o2o:customer:last-mobile') as string) || '';
  return maskPhone(mobile) || '-';
});

async function onSendSms(): Promise<void> {
  if (smsRemaining.value > 0 || sending.value) return;
  errorMsg.value = '';
  sending.value = true;
  try {
    const mobile = auth.mobile || (uni.getStorageSync('o2o:customer:last-mobile') as string) || '';
    if (!mobile) {
      errorMsg.value = '未取到手机号,请重新登录';
      return;
    }
    auth.setMobile(mobile);
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
    auth.setRealnameStatus(r.data.verifyStatus === 'success' ? 'verified' : 'failed');
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '提交失败';
  } finally {
    submitting.value = false;
  }
}

function resetForm(): void {
  realName.value = '';
  idCardNo.value = '';
  smsCode.value = '';
  errorMsg.value = '';
  result.value = null;
}

function goBack(): void {
  uni.navigateBack();
}

onUnmounted(() => {
  if (smsTimer) clearInterval(smsTimer);
});
</script>

<template>
  <view class="rn">
    <!-- Hero — 与"我的"页同款深色 hero -->
    <view class="rn__hero">
      <view class="rn__hero-deco rn__hero-deco--1" />
      <view class="rn__hero-deco rn__hero-deco--2" />

      <view class="rn__hero-badge">
        <SvgIcon name="shield-check" :size="52" color="#ff7a45" />
      </view>
      <view class="rn__hero-text">
        <text class="rn__hero-title">实名认证</text>
        <text class="rn__hero-sub">完成认证后即可使用外卖、跑腿等核心服务</text>
      </view>

      <!-- 步骤进度 -->
      <view class="rn__steps">
        <view class="rn__step" :class="{ 'rn__step--done': stepStatus.name }">
          <view class="rn__step-dot">
            <SvgIcon v-if="stepStatus.name" name="check" :size="20" color="#fff" />
            <text v-else class="rn__step-num">1</text>
          </view>
          <text class="rn__step-label">姓名</text>
        </view>
        <view class="rn__step-line" :class="{ 'rn__step-line--done': stepStatus.name }" />
        <view class="rn__step" :class="{ 'rn__step--done': stepStatus.id }">
          <view class="rn__step-dot">
            <SvgIcon v-if="stepStatus.id" name="check" :size="20" color="#fff" />
            <text v-else class="rn__step-num">2</text>
          </view>
          <text class="rn__step-label">证件</text>
        </view>
        <view class="rn__step-line" :class="{ 'rn__step-line--done': stepStatus.id }" />
        <view class="rn__step" :class="{ 'rn__step--done': stepStatus.sms }">
          <view class="rn__step-dot">
            <SvgIcon v-if="stepStatus.sms" name="check" :size="20" color="#fff" />
            <text v-else class="rn__step-num">3</text>
          </view>
          <text class="rn__step-label">校验</text>
        </view>
      </view>
    </view>

    <!-- 成功 / 失败结果卡 -->
    <view v-if="result?.status === 'success'" class="rn__result rn__result--ok">
      <view class="rn__result-icon">
        <SvgIcon name="check-circle" :size="80" color="#11998e" />
      </view>
      <text class="rn__result-title">认证成功</text>
      <text class="rn__result-sub">您已通过实名认证,所有功能即刻可用</text>
      <text v-if="result.verifiedAt" class="rn__result-time">
        {{ new Date(result.verifiedAt).toLocaleString() }}
      </text>
      <view class="rn__result-cta" @tap="goBack">完成,返回</view>
    </view>

    <view v-else-if="result?.status === 'failed'" class="rn__result rn__result--fail">
      <view class="rn__result-icon">
        <SvgIcon name="alert-circle" :size="80" color="#ff4d4f" />
      </view>
      <text class="rn__result-title">认证未通过</text>
      <text class="rn__result-sub">{{ result.reason || '身份信息核验失败,请核对后重试' }}</text>
      <view class="rn__result-cta rn__result-cta--fail" @tap="resetForm">重新认证</view>
    </view>

    <!-- 表单卡片(仅未出结果时显示) -->
    <template v-if="!result">
      <view class="rn__card">
        <view class="rn__field">
          <view class="rn__field-icon"><SvgIcon name="user" :size="28" color="#ff7a45" /></view>
          <view class="rn__field-main">
            <text class="rn__field-label">真实姓名</text>
            <input class="rn__field-input" type="text" placeholder="与身份证一致" v-model="realName" maxlength="50" />
          </view>
          <view v-if="nameValid" class="rn__field-check">
            <SvgIcon name="check" :size="20" color="#11998e" />
          </view>
        </view>

        <view class="rn__field">
          <view class="rn__field-icon"><SvgIcon name="credit-card" :size="28" color="#ff7a45" /></view>
          <view class="rn__field-main">
            <text class="rn__field-label">身份证号</text>
            <IdCardInput v-model="idCardNo" />
          </view>
          <view v-if="idValid" class="rn__field-check">
            <SvgIcon name="check" :size="20" color="#11998e" />
          </view>
        </view>

        <view class="rn__field rn__field--last">
          <view class="rn__field-icon"><SvgIcon name="lock" :size="28" color="#ff7a45" /></view>
          <view class="rn__field-main">
            <view class="rn__field-label-row">
              <text class="rn__field-label">短信验证码</text>
              <text class="rn__field-mobile">{{ maskedMobile }}</text>
            </view>
            <view class="rn__sms-row">
              <view class="rn__sms-input"><SmsCodeInput v-model="smsCode" /></view>
              <view
                class="rn__sms-btn"
                :class="{ 'rn__sms-btn--disabled': smsRemaining > 0 || sending }"
                @tap="onSendSms"
              >
                {{ smsRemaining > 0 ? `${smsRemaining}s 后重发` : sending ? '发送中…' : '获取验证码' }}
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 安全说明 -->
      <view class="rn__hint">
        <SvgIcon name="shield" :size="22" color="#ff7a45" />
        <text class="rn__hint-text"> 您的身份信息全程加密传输,仅用于实名核验,不会用于任何商业用途 </text>
      </view>

      <view v-if="errorMsg" class="rn__error">
        <SvgIcon name="alert-circle" :size="22" color="#ff4d4f" />
        <text class="rn__error-text">{{ errorMsg }}</text>
      </view>

      <!-- 底部固定提交按钮 -->
      <view class="rn__footer">
        <view class="rn__progress">
          <view class="rn__progress-track">
            <view class="rn__progress-fill" :style="`width: ${(completedSteps / 3) * 100}%`" />
          </view>
          <text class="rn__progress-text">{{ completedSteps }} / 3 已完成</text>
        </view>
        <view class="rn__submit" :class="{ 'rn__submit--disabled': !canSubmit }" @tap="onSubmit">
          {{ submitting ? '提交中…' : '提交认证' }}
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
/* 与"我的"页保持完全一致的页面骨架 */
.rn {
  min-height: 100vh;
  padding: 28rpx 24rpx 240rpx;
  background: #fff;
}

/* ===== Hero — 与"我的"页同款深色渐变 ===== */
.rn__hero {
  position: relative;
  overflow: hidden;
  padding: 44rpx 32rpx;
  background: linear-gradient(135deg, #273248, #56637a);
  color: #fff;
  border-radius: 34rpx;
  box-shadow: 0 20rpx 54rpx rgba(23, 32, 51, 0.2);
}
.rn__hero-deco {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  pointer-events: none;
}
.rn__hero-deco--1 {
  width: 220rpx;
  height: 220rpx;
  right: -60rpx;
  top: -60rpx;
}
.rn__hero-deco--2 {
  width: 150rpx;
  height: 150rpx;
  left: -50rpx;
  bottom: -70rpx;
}
.rn__hero-badge {
  width: 96rpx;
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, rgba(255, 122, 69, 0.18), rgba(255, 176, 32, 0.18));
  border: 2rpx solid rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 22rpx;
  box-shadow: inset 0 0 0 6rpx rgba(255, 255, 255, 0.04);
}
.rn__hero-text {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.rn__hero-title {
  font-size: 40rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
}
.rn__hero-sub {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.76);
  line-height: 1.5;
}

/* ===== Steps ===== */
.rn__steps {
  display: flex;
  align-items: center;
  margin-top: 30rpx;
  padding: 0 4rpx;
}
.rn__step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.rn__step-dot {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  border: 2rpx solid rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 240ms ease;
}
.rn__step-num {
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
}
.rn__step--done .rn__step-dot {
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  border-color: rgba(255, 122, 69, 0.5);
  box-shadow: 0 4rpx 14rpx rgba(255, 122, 69, 0.5);
}
.rn__step-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.78);
  font-weight: 500;
}
.rn__step-line {
  flex: 1;
  height: 4rpx;
  background: rgba(255, 255, 255, 0.14);
  margin: 0 12rpx 24rpx;
  border-radius: 2rpx;
  transition: background 240ms ease;
}
.rn__step-line--done {
  background: linear-gradient(90deg, #ff7a45, rgba(255, 176, 32, 0.4));
}

/* ===== 表单卡 — 跟"我"页 menu 卡片同款 ===== */
.rn__card {
  margin-top: 16rpx;
  padding: 0 32rpx;
  background: #fff;
  border-radius: 28rpx;
  overflow: hidden;
  box-shadow: 0 10rpx 28rpx rgba(31, 41, 55, 0.06);
}
.rn__field {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.rn__field--last {
  border-bottom: none;
}
.rn__field-icon {
  width: 60rpx;
  height: 60rpx;
  border-radius: 16rpx;
  background: rgba(255, 122, 69, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rn__field-main {
  flex: 1;
  min-width: 0;
}
.rn__field-label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.rn__field-label {
  display: block;
  font-size: 24rpx;
  color: #8a94a6;
  margin-bottom: 8rpx;
  font-weight: 500;
}
.rn__field-mobile {
  font-size: 22rpx;
  color: #b6bfcd;
  letter-spacing: 1rpx;
}
.rn__field-input {
  width: 100%;
  font-size: 30rpx;
  color: #172033;
  padding: 4rpx 0;
}
.rn__field-check {
  width: 38rpx;
  height: 38rpx;
  border-radius: 50%;
  background: rgba(17, 153, 142, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 28rpx;
  flex-shrink: 0;
}

/* 子组件 — 移除自带下划线,继承本页 input 风格 */
.rn__field-main :deep(.id-card-input),
.rn__field-main :deep(.sms-code-input) {
  border-bottom: none;
  padding: 0;
}
.rn__field-main :deep(.id-card-input__field),
.rn__field-main :deep(.sms-code-input__field) {
  font-size: 30rpx;
  color: #172033;
  padding: 4rpx 0;
}
.rn__field-main :deep(.id-card-input__hint) {
  font-size: 22rpx;
  color: #ff4d4f;
  margin-top: 6rpx;
}

/* SMS 行 */
.rn__sms-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.rn__sms-input {
  flex: 1;
  min-width: 0;
}
.rn__sms-btn {
  flex-shrink: 0;
  padding: 14rpx 24rpx;
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  color: #fff;
  font-size: 24rpx;
  font-weight: 600;
  border-radius: 999rpx;
  box-shadow: 0 6rpx 16rpx rgba(255, 122, 69, 0.32);
}
.rn__sms-btn--disabled {
  background: #e5e7eb;
  color: #9ca3af;
  box-shadow: none;
}

/* ===== 安全说明 ===== */
.rn__hint {
  margin-top: 16rpx;
  padding: 20rpx 24rpx;
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  background: rgba(255, 122, 69, 0.08);
  border-radius: 20rpx;
  border: 1rpx dashed rgba(255, 122, 69, 0.32);
}
.rn__hint-text {
  flex: 1;
  font-size: 22rpx;
  color: #ff6b35;
  line-height: 1.5;
}

/* ===== 错误提示 ===== */
.rn__error {
  margin-top: 12rpx;
  padding: 18rpx 24rpx;
  background: rgba(255, 77, 79, 0.08);
  border-radius: 20rpx;
  border: 1rpx solid rgba(255, 77, 79, 0.22);
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.rn__error-text {
  flex: 1;
  font-size: 24rpx;
  color: #ff4d4f;
}

/* ===== 底部固定提交 ===== */
.rn__footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 24rpx calc(env(safe-area-inset-bottom, 0rpx) + 20rpx);
  background: #fff;
  backdrop-filter: blur(14px);
  border-top: 1rpx solid rgba(31, 41, 55, 0.06);
  z-index: 10;
}
.rn__progress {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 14rpx;
}
.rn__progress-track {
  flex: 1;
  height: 8rpx;
  background: rgba(31, 41, 55, 0.08);
  border-radius: 999rpx;
  overflow: hidden;
}
.rn__progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff7a45, #ffb020);
  border-radius: 999rpx;
  transition: width 280ms ease;
}
.rn__progress-text {
  font-size: 22rpx;
  color: #8a94a6;
  font-weight: 500;
  flex-shrink: 0;
}
.rn__submit {
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
  padding: 26rpx 0;
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  border-radius: 999rpx;
  letter-spacing: 4rpx;
  box-shadow: 0 16rpx 36rpx rgba(255, 122, 69, 0.4);
  transition: transform 120ms ease;
}
.rn__submit:active {
  transform: scale(0.98);
}
.rn__submit--disabled {
  background: #d1d5db;
  color: rgba(255, 255, 255, 0.86);
  box-shadow: none;
}

/* ===== 成功 / 失败 ===== */
.rn__result {
  margin-top: 16rpx;
  padding: 56rpx 36rpx 40rpx;
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 10rpx 28rpx rgba(31, 41, 55, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.rn__result-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}
.rn__result--ok .rn__result-icon {
  background: rgba(17, 153, 142, 0.12);
}
.rn__result--fail .rn__result-icon {
  background: rgba(255, 77, 79, 0.12);
}
.rn__result-title {
  font-size: 40rpx;
  font-weight: 800;
  color: #172033;
}
.rn__result--ok .rn__result-title {
  color: #11998e;
}
.rn__result--fail .rn__result-title {
  color: #ff4d4f;
}
.rn__result-sub {
  font-size: 26rpx;
  color: #6b7280;
  text-align: center;
  line-height: 1.6;
  padding: 0 16rpx;
}
.rn__result-time {
  font-size: 22rpx;
  color: #b6bfcd;
  margin-top: 8rpx;
  letter-spacing: 1rpx;
}
.rn__result-cta {
  margin-top: 24rpx;
  width: 100%;
  text-align: center;
  padding: 24rpx 0;
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  border-radius: 999rpx;
  box-shadow: 0 12rpx 28rpx rgba(255, 122, 69, 0.36);
  letter-spacing: 4rpx;
}
.rn__result-cta--fail {
  background: linear-gradient(135deg, #ff4d4f, #ff7875);
  box-shadow: 0 12rpx 28rpx rgba(255, 77, 79, 0.36);
}
</style>
