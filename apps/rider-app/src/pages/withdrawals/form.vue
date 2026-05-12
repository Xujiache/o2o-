<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

import { getProfile, sendSmsCode } from '@/api';
import { getEarnings } from '@/api/rider-earnings';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { useWithdrawalStore } from '@/stores/withdrawal';

const store = useWithdrawalStore();
const mobile = ref('');
const amountYuan = ref('');
const smsCode = ref('');
const sending = ref(false);
const submitting = ref(false);
const smsRemaining = ref(0);

const totalIncomeYuan = ref('0.00');
const pendingAmountYuan = ref('0.00');

const SINGLE_LIMIT_YUAN = 1000;

let smsTimer: ReturnType<typeof setInterval> | null = null;

async function loadBalance(): Promise<void> {
  const [p, e] = await Promise.all([getProfile(), getEarnings({ pageNo: 1, pageSize: 100 })]);
  if (p.code === '0' && p.data && p.data.mobile) {
    mobile.value = p.data.mobile;
  }
  if (e.code === '0' && e.data) {
    totalIncomeYuan.value = e.data.totalIncome ?? '0.00';
  }
  await store.refresh();
  // 派生:计算审核中/处理中的提现金额(还没真正出账)
  const pendingCents = store.items
    .filter((w) => w.status === 'PENDING' || w.status === 'APPROVED')
    .reduce((acc, w) => acc + Number(w.amountCents || 0), 0);
  pendingAmountYuan.value = (pendingCents / 100).toFixed(2);
}

onMounted(loadBalance);
onUnmounted(() => {
  if (smsTimer) clearInterval(smsTimer);
});

async function sendCode(): Promise<void> {
  if (smsRemaining.value > 0 || sending.value) return;
  if (!mobile.value || mobile.value.length !== 11) {
    uni.showToast({ title: '请输入 11 位手机号', icon: 'none' });
    return;
  }
  sending.value = true;
  try {
    const r = await sendSmsCode({ mobile: mobile.value, scene: 'sensitive' });
    if (r.code !== '0') {
      uni.showToast({ title: r.message ?? '发送失败', icon: 'none' });
      return;
    }
    uni.showToast({ title: '已发送', icon: 'success' });
    smsRemaining.value = Math.min(60, r.data?.expireSeconds ?? 60);
    if (smsTimer) clearInterval(smsTimer);
    smsTimer = setInterval(() => {
      smsRemaining.value--;
      if (smsRemaining.value <= 0 && smsTimer) {
        clearInterval(smsTimer);
        smsTimer = null;
      }
    }, 1000);
  } finally {
    sending.value = false;
  }
}

function applyMax(): void {
  const max = Math.min(Number(totalIncomeYuan.value) - Number(pendingAmountYuan.value), SINGLE_LIMIT_YUAN);
  if (max <= 0) {
    uni.showToast({ title: '当前无可提现金额', icon: 'none' });
    return;
  }
  amountYuan.value = max.toFixed(2);
}

async function submit(): Promise<void> {
  const cents = Math.round(Number(amountYuan.value) * 100);
  if (!Number.isFinite(cents) || cents <= 0) {
    uni.showToast({ title: '请输入正确金额', icon: 'none' });
    return;
  }
  if (cents > SINGLE_LIMIT_YUAN * 100) {
    uni.showToast({ title: `单笔上限 ¥${SINGLE_LIMIT_YUAN}`, icon: 'none' });
    return;
  }
  if (!mobile.value || mobile.value.length !== 11) {
    uni.showToast({ title: '请输入 11 位手机号', icon: 'none' });
    return;
  }
  if (!smsCode.value || smsCode.value.length !== 6) {
    uni.showToast({ title: '请输入 6 位验证码', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    const ok = await store.submit({ amountCents: cents, mobile: mobile.value, smsCode: smsCode.value });
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

function gotoRecords(): void {
  uni.navigateTo({ url: '/pages/withdrawals/records' });
}
</script>

<template>
  <view class="w">
    <!-- Hero 余额卡 -->
    <view class="w__hero">
      <view class="w__hero-deco w__hero-deco--1" />
      <view class="w__hero-deco w__hero-deco--2" />
      <text class="w__hero-eyebrow">可提现余额</text>
      <view class="w__hero-row">
        <text class="w__hero-symbol">¥</text>
        <text class="w__hero-num">{{ totalIncomeYuan }}</text>
      </view>
      <view class="w__hero-meta">
        <view class="w__hero-meta-item">
          <text class="w__hero-meta-label">审核中</text>
          <text class="w__hero-meta-val">¥{{ pendingAmountYuan }}</text>
        </view>
        <view class="w__hero-meta-divider" />
        <view class="w__hero-meta-item">
          <text class="w__hero-meta-label">单笔上限</text>
          <text class="w__hero-meta-val">¥{{ SINGLE_LIMIT_YUAN }}</text>
        </view>
        <view class="w__hero-records" @tap="gotoRecords">
          <text>提现记录</text>
          <text class="w__hero-records-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 金额输入 -->
    <view class="w__amount">
      <text class="w__amount-label">提现金额</text>
      <view class="w__amount-row">
        <text class="w__amount-symbol">¥</text>
        <input
          v-model="amountYuan"
          type="digit"
          class="w__amount-input"
          placeholder="0.00"
          placeholder-class="w__amount-placeholder"
        />
        <view class="w__amount-max" @tap="applyMax">全部</view>
      </view>
      <text class="w__amount-hint">每笔提现需支付平台手续费 0 元(优惠期)</text>
    </view>

    <!-- 手机 + 验证码 -->
    <view class="w__card">
      <view class="w__field">
        <view class="w__field-icon"><SvgIcon name="phone" :size="24" color="#0f766e" /></view>
        <view class="w__field-main">
          <text class="w__field-label">手机号</text>
          <input v-model="mobile" type="number" maxlength="11" class="w__field-input" placeholder="11 位手机号" />
        </view>
      </view>
      <view class="w__field w__field--last">
        <view class="w__field-icon"><SvgIcon name="check-circle" :size="24" color="#0f766e" /></view>
        <view class="w__field-main">
          <text class="w__field-label">短信验证码</text>
          <view class="w__sms-row">
            <input v-model="smsCode" type="number" maxlength="6" class="w__field-input" placeholder="6 位验证码" />
            <view class="w__sms-btn" :class="{ 'w__sms-btn--disabled': smsRemaining > 0 || sending }" @tap="sendCode">
              {{ smsRemaining > 0 ? `${smsRemaining}s 后重发` : sending ? '发送中…' : '获取验证码' }}
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 风控提示 -->
    <view class="w__hints">
      <view class="w__hint">
        <SvgIcon name="lightbulb" :size="18" color="#0f766e" />
        <text>提现到注册手机号绑定的银行卡,工作日 T+1 到账</text>
      </view>
      <view class="w__hint">
        <SvgIcon name="lightbulb" :size="18" color="#0f766e" />
        <text>单笔上限 ¥1,000,单日上限 ¥10,000</text>
      </view>
      <view class="w__hint">
        <SvgIcon name="lightbulb" :size="18" color="#0f766e" />
        <text>如遇异常,请联系骑手专线 400-000-0001</text>
      </view>
    </view>

    <!-- 底部固定 -->
    <view class="w__footer">
      <view class="w__submit" :class="{ 'w__submit--disabled': submitting }" @tap="submit">
        {{ submitting ? '提交中…' : '提交提现' }}
      </view>
    </view>
  </view>
</template>

<style scoped>
.w {
  min-height: 100vh;
  padding: 0 0 calc(env(safe-area-inset-bottom, 0rpx) + 200rpx);
  background: #f5f6f8;
}

/* Hero */
.w__hero {
  position: relative;
  overflow: hidden;
  padding: 36rpx 28rpx 40rpx;
  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
  color: #fff;
}
.w__hero-deco {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  pointer-events: none;
}
.w__hero-deco--1 {
  width: 220rpx;
  height: 220rpx;
  right: -60rpx;
  top: -60rpx;
}
.w__hero-deco--2 {
  width: 140rpx;
  height: 140rpx;
  left: -40rpx;
  bottom: -50rpx;
}
.w__hero-eyebrow {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.78);
  letter-spacing: 1rpx;
  position: relative;
}
.w__hero-row {
  margin-top: 12rpx;
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  position: relative;
}
.w__hero-symbol {
  font-size: 32rpx;
  font-weight: 600;
}
.w__hero-num {
  font-size: 72rpx;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -2rpx;
  font-feature-settings: 'tnum';
}
.w__hero-meta {
  margin-top: 22rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  gap: 16rpx;
  position: relative;
}
.w__hero-meta-item {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.w__hero-meta-label {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.72);
}
.w__hero-meta-val {
  font-size: 24rpx;
  font-weight: 700;
  font-feature-settings: 'tnum';
}
.w__hero-meta-divider {
  width: 1rpx;
  height: 40rpx;
  background: rgba(255, 255, 255, 0.22);
}
.w__hero-records {
  margin-left: auto;
  padding: 10rpx 16rpx;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 8rpx;
  font-size: 22rpx;
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.w__hero-records-arrow {
  font-size: 26rpx;
}

/* 金额输入大块 */
.w__amount {
  margin: 16rpx 24rpx 0;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
  padding: 28rpx 28rpx 22rpx;
}
.w__amount-label {
  font-size: 24rpx;
  color: #8a94a6;
}
.w__amount-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 14rpx;
  padding-bottom: 18rpx;
  border-bottom: 2rpx solid #f0f1f3;
}
.w__amount-symbol {
  font-size: 40rpx;
  font-weight: 800;
  color: #172033;
}
.w__amount-input {
  flex: 1;
  font-size: 64rpx;
  font-weight: 800;
  color: #172033;
  font-feature-settings: 'tnum';
  letter-spacing: -1rpx;
  line-height: 1;
}
.w__amount-placeholder {
  color: #c5c9d2;
  font-weight: 800;
}
.w__amount-max {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  border: 1rpx solid #0f766e;
  color: #0f766e;
  font-size: 22rpx;
  font-weight: 700;
  flex-shrink: 0;
}
.w__amount-hint {
  display: block;
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #8a94a6;
}

/* 表单卡 */
.w__card {
  margin: 16rpx 24rpx 0;
  padding: 0 28rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
}
.w__field {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f1f3;
}
.w__field--last {
  border-bottom: none;
}
.w__field-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 10rpx;
  background: rgba(15, 118, 110, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.w__field-main {
  flex: 1;
  min-width: 0;
}
.w__field-label {
  font-size: 22rpx;
  color: #8a94a6;
  display: block;
  margin-bottom: 6rpx;
}
.w__field-input {
  width: 100%;
  font-size: 30rpx;
  color: #172033;
  padding: 4rpx 0;
  font-feature-settings: 'tnum';
}
.w__sms-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.w__sms-btn {
  flex-shrink: 0;
  padding: 12rpx 22rpx;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  color: #fff;
  font-size: 22rpx;
  font-weight: 600;
  border-radius: 999rpx;
  box-shadow: 0 6rpx 16rpx rgba(15, 118, 110, 0.32);
}
.w__sms-btn--disabled {
  background: #dde2ea;
  color: #b6bfcd;
  box-shadow: none;
}

/* 风控提示 */
.w__hints {
  margin: 16rpx 24rpx 0;
  padding: 18rpx 22rpx;
  background: rgba(15, 118, 110, 0.05);
  border: 1rpx dashed rgba(15, 118, 110, 0.24);
  border-radius: 14rpx;
}
.w__hint {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  padding: 6rpx 0;
  font-size: 22rpx;
  color: #5a6275;
  line-height: 1.5;
}

/* 底部固定 */
.w__footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 24rpx calc(env(safe-area-inset-bottom, 0rpx) + 20rpx);
  background: rgba(245, 246, 248, 0.96);
  backdrop-filter: blur(14px);
  border-top: 1rpx solid #e6e9ee;
}
.w__submit {
  text-align: center;
  padding: 26rpx 0;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: 12rpx;
  letter-spacing: 4rpx;
  box-shadow: 0 14rpx 32rpx rgba(15, 118, 110, 0.4);
}
.w__submit--disabled {
  background: #dde2ea;
  color: rgba(255, 255, 255, 0.86);
  box-shadow: none;
}
</style>
