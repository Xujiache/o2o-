<script setup lang="ts">
import { ref } from 'vue';

import { sendSmsCode } from '@/api';
import { useSettlementStore } from '@/stores/settlement';

const store = useSettlementStore();
const mobile = ref('');
const amountYuan = ref('');
const smsCode = ref('');
const sending = ref(false);
const submitting = ref(false);

async function sendCode(): Promise<void> {
  if (!mobile.value || mobile.value.length !== 11) {
    uni.showToast({ title: '请输入 11 位手机号', icon: 'none' });
    return;
  }
  sending.value = true;
  try {
    const r = await sendSmsCode({ mobile: mobile.value, scene: 'sensitive' });
    if (r.code === '0') uni.showToast({ title: '验证码已发送', icon: 'success' });
    else uni.showToast({ title: r.message ?? '发送失败', icon: 'none' });
  } finally {
    sending.value = false;
  }
}

async function submit(): Promise<void> {
  const cents = Math.round(Number(amountYuan.value) * 100);
  if (!Number.isFinite(cents) || cents <= 0) {
    uni.showToast({ title: '请输入金额', icon: 'none' });
    return;
  }
  if (!smsCode.value || smsCode.value.length !== 6) {
    uni.showToast({ title: '请输入 6 位验证码', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    const ok = await store.submitWithdrawal(cents, smsCode.value);
    if (ok) {
      uni.showToast({ title: '已提交', icon: 'success' });
      setTimeout(() => uni.redirectTo({ url: '/pages/withdrawals/records' }), 600);
    } else {
      uni.showToast({ title: '提现失败', icon: 'none' });
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="w">
    <view class="w__title">提现</view>
    <view class="w__row">
      <text class="w__label">手机号</text>
      <input v-model="mobile" maxlength="11" class="w__input" />
    </view>
    <view class="w__row">
      <text class="w__label">金额(元)</text>
      <input v-model="amountYuan" type="digit" class="w__input" />
    </view>
    <view class="w__row">
      <text class="w__label">短信验证码</text>
      <input v-model="smsCode" maxlength="6" class="w__input" />
      <button size="mini" :loading="sending" @tap="sendCode">发送</button>
    </view>
    <button type="warn" :loading="submitting" @tap="submit">提交提现</button>
    <view class="w__hint">单笔上限 ¥10000,单日上限 ¥50000</view>
  </view>
</template>

<style scoped>
.w {
  padding: 24rpx;
}
.w__title {
  font-size: 32rpx;
  font-weight: 600;
  padding: 16rpx 0;
}
.w__row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
}
.w__label {
  width: 200rpx;
  color: #444;
}
.w__input {
  flex: 1;
  background: #fff;
  padding: 14rpx 20rpx;
  border-radius: 10rpx;
}
.w__hint {
  color: #888;
  padding: 16rpx 0;
  font-size: 22rpx;
}
</style>
