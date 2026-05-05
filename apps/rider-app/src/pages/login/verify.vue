<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { computed, onMounted, ref } from 'vue';

import SmsCodeInput from '@/components/common/SmsCodeInput.vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const mobile = ref('');
const code = ref('');
const submitting = ref(false);
const remaining = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

const canResend = computed(() => remaining.value <= 0);

onLoad((options) => {
  mobile.value = (options?.mobile as string | undefined) ?? '';
});

onMounted(() => {
  remaining.value = auth.smsRemainingSeconds;
  timer = setInterval(() => {
    remaining.value = auth.smsRemainingSeconds;
    if (remaining.value <= 0) {
      auth.clearSmsCountdown();
      if (timer) clearInterval(timer);
      timer = null;
    }
  }, 1000);
});

async function onSubmit(): Promise<void> {
  if (code.value.length !== 6 || submitting.value) return;
  submitting.value = true;
  try {
    await auth.loginByMobile(mobile.value, code.value);
    if (auth.hasApplication) {
      uni.reLaunch({ url: '/pages/onboarding/progress' });
    } else {
      uni.reLaunch({ url: '/pages/onboarding/apply' });
    }
  } catch (e) {
    uni.showToast({ icon: 'none', title: e instanceof Error ? e.message : '登录失败' });
  } finally {
    submitting.value = false;
  }
}

async function onResend(): Promise<void> {
  if (!canResend.value) return;
  try {
    await auth.sendSms(mobile.value);
    remaining.value = 60;
  } catch (e) {
    uni.showToast({ icon: 'none', title: e instanceof Error ? e.message : '发送失败' });
  }
}
</script>

<template>
  <view class="verify">
    <view class="verify__title">输入验证码</view>
    <view class="verify__desc">已发送至 {{ mobile }}</view>
    <SmsCodeInput v-model="code" />
    <button class="verify__btn" :disabled="code.length !== 6 || submitting" @click="onSubmit">
      {{ submitting ? '登录中...' : '登录' }}
    </button>
    <view class="verify__resend" :class="{ disabled: !canResend }" @click="onResend">
      {{ canResend ? '重新发送' : `${remaining}s 后可重发` }}
    </view>
  </view>
</template>

<style scoped>
.verify {
  padding: 64rpx 48rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.verify__title {
  font-size: 40rpx;
  font-weight: 600;
}
.verify__desc {
  font-size: 26rpx;
  color: #666;
}
.verify__btn {
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
  margin-top: 16rpx;
}
.verify__btn[disabled] {
  background: #aac4ff;
}
.verify__resend {
  text-align: center;
  font-size: 26rpx;
  color: #4c84ff;
  margin-top: 24rpx;
}
.verify__resend.disabled {
  color: #999;
}
</style>
