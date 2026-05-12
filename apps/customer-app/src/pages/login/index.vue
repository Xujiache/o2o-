<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const mobile = ref('');
const code = ref('');
const sending = ref(false);
const submitting = ref(false);
const errorMsg = ref('');
const remaining = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

const mobileValid = computed(() => /^1[3-9]\d{9}$/.test(mobile.value));
const canSendSms = computed(() => mobileValid.value && remaining.value <= 0 && !sending.value);
const canSubmit = computed(() => mobileValid.value && /^\d{6}$/.test(code.value) && !submitting.value);

function startTimer(): void {
  remaining.value = auth.smsRemainingSeconds;
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    remaining.value = auth.smsRemainingSeconds;
    if (remaining.value <= 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  }, 1000);
}

onMounted(() => {
  if (auth.smsCountdown?.mobile) mobile.value = auth.smsCountdown.mobile;
  startTimer();
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

async function onSendSms(): Promise<void> {
  if (!canSendSms.value) return;
  errorMsg.value = '';
  sending.value = true;
  try {
    await auth.sendSms(mobile.value, 'login');
    startTimer();
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '验证码发送失败';
  } finally {
    sending.value = false;
  }
}

async function onLogin(): Promise<void> {
  if (!canSubmit.value) return;
  errorMsg.value = '';
  submitting.value = true;
  try {
    await auth.loginByMobile(mobile.value, code.value);
    auth.clearSmsCountdown();
    uni.switchTab({ url: '/pages/me/index' });
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '登录失败';
  } finally {
    submitting.value = false;
  }
}

function onWechat(): void {
  uni.navigateTo({ url: '/pages/login/wechat' });
}
</script>

<template>
  <view class="login">
    <view class="login__hero">
      <view class="login__greet">您好，</view>
      <view class="login__title">欢迎使用笑联</view>
    </view>

    <view class="login__card">
      <view class="login__field">
        <text class="login__label">手机号</text>
        <input
          v-model="mobile"
          class="login__input"
          type="number"
          maxlength="11"
          placeholder="请输入您的手机号"
          placeholder-class="login__placeholder"
        />
      </view>

      <view class="login__field">
        <text class="login__label">验证码</text>
        <view class="login__row">
          <input
            v-model="code"
            class="login__input login__input--inline"
            type="number"
            maxlength="6"
            placeholder="请输入验证码"
            placeholder-class="login__placeholder"
          />
          <text class="login__sms" :class="{ 'login__sms--disabled': !canSendSms }" @click="onSendSms">
            {{ remaining > 0 ? `${remaining}s 后重发` : sending ? '发送中...' : '获取验证码' }}
          </text>
        </view>
      </view>

      <text v-if="errorMsg" class="login__error">{{ errorMsg }}</text>

      <view class="login__btn login__btn--primary" :class="{ 'login__btn--disabled': !canSubmit }" @tap="onLogin">
        {{ submitting ? '登录中...' : '登录' }}
      </view>
    </view>

    <view class="login__third">
      <view class="login__divider"><text>第三方登录</text></view>
      <view class="login__icons">
        <view class="login__icon login__icon--wechat" @click="onWechat">
          <text class="login__icon-text">微</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.login {
  min-height: 100vh;
  background: #fff;
  position: relative;
}
.login__hero {
  padding: 120rpx 56rpx 200rpx;
  background: linear-gradient(160deg, #ff7a45 0%, #ffb020 100%);
  color: #fff;
}
.login__greet {
  font-size: 56rpx;
  font-weight: 600;
  line-height: 1.3;
}
.login__title {
  font-size: 56rpx;
  font-weight: 600;
  line-height: 1.3;
}
.login__card {
  position: relative;
  margin: -120rpx 32rpx 0;
  padding: 48rpx 40rpx 56rpx;
  background: #fff;
  border-radius: 32rpx;
  box-shadow: 0 20rpx 60rpx rgba(255, 107, 53, 0.14);
}
.login__field {
  margin-bottom: 32rpx;
}
.login__label {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16rpx;
}
.login__input {
  width: 100%;
  height: 72rpx;
  font-size: 28rpx;
  color: #1f2937;
  border-bottom: 1rpx solid #e5e7eb;
}
.login__placeholder {
  color: #c7cbd1;
  font-size: 28rpx;
}
.login__row {
  display: flex;
  align-items: center;
  border-bottom: 1rpx solid #e5e7eb;
}
.login__input--inline {
  flex: 1;
  border-bottom: none;
}
.login__sms {
  font-size: 26rpx;
  color: #ff7a45;
  padding-left: 16rpx;
  white-space: nowrap;
}
.login__sms--disabled {
  color: #b0b6bf;
}
.login__error {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #ff4d4f;
}
.login__btn {
  margin-top: 40rpx;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 999rpx;
  font-size: 30rpx;
  font-weight: 600;
  text-align: center;
}
.login__btn--primary {
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  color: #fff;
}
.login__btn--primary.login__btn--disabled {
  background: #ffd7c2;
  color: #fff;
}
.login__third {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 80rpx;
  padding: 0 64rpx;
}
.login__divider {
  text-align: center;
  font-size: 24rpx;
  color: #9aa1ab;
  margin-bottom: 32rpx;
}
.login__icons {
  display: flex;
  justify-content: center;
}
.login__icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.login__icon--wechat {
  background: #1aad19;
}
.login__icon-text {
  color: #fff;
  font-size: 40rpx;
  font-weight: 600;
}
</style>
