<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import SmsCodeInput from '@/components/common/SmsCodeInput.vue';
import { useAuthStore } from '@/stores/auth';
import NavBar from '@/components/common/NavBar.vue';

const auth = useAuthStore();
const mobile = ref('');
const code = ref('');
const submitting = ref(false);
const errorMsg = ref('');
const remaining = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

const maskedMobile = computed(() => {
  return mobile.value.length === 11 ? `${mobile.value.slice(0, 3)}****${mobile.value.slice(-4)}` : mobile.value;
});
const canSubmit = computed(() => /^\d{6}$/.test(code.value) && !submitting.value);

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
  // uni-app:小程序通过 onLoad 接 query;H5/vitest 直接读
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const route = (getCurrentPages?.() as any[])?.at(-1);
  const q = route?.options ?? {};
  mobile.value = (q.mobile as string) || auth.smsCountdown?.mobile || '';
  startTimer();
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

async function onResend(): Promise<void> {
  if (remaining.value > 0 || !mobile.value) return;
  try {
    await auth.sendSms(mobile.value, 'login');
    startTimer();
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '重发失败';
  }
}

async function onSubmit(): Promise<void> {
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
</script>

<template>
  <view class="verify">
    <NavBar title="短信验证" />
    <view class="verify__title">输入验证码</view>
    <text class="verify__hint">已发送至 {{ maskedMobile }}</text>

    <SmsCodeInput v-model="code" />

    <view class="verify__resend">
      <text v-if="remaining > 0" class="verify__resend-disabled">{{ remaining }} 秒后重发</text>
      <text v-else class="verify__resend-link" @click="onResend">重新发送</text>
    </view>

    <button class="verify__btn" :disabled="!canSubmit" @click="onSubmit">
      {{ submitting ? '登录中...' : '登录' }}
    </button>

    <text v-if="errorMsg" class="verify__error">{{ errorMsg }}</text>
  </view>
</template>

<style scoped>
.verify {
  padding: 80rpx 48rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.verify__title {
  font-size: 48rpx;
  font-weight: 600;
}
.verify__hint {
  font-size: 26rpx;
  color: #888;
}
.verify__resend {
  text-align: right;
  margin-top: 12rpx;
}
.verify__resend-disabled {
  font-size: 26rpx;
  color: #999;
}
.verify__resend-link {
  font-size: 26rpx;
  color: #4c84ff;
}
.verify__btn {
  margin-top: 32rpx;
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
.verify__btn[disabled] {
  background: #c5d4ff;
}
.verify__error {
  color: var(--price-color);
  font-size: 26rpx;
}
</style>
