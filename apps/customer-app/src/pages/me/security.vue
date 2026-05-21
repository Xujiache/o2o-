<script setup lang="ts">
import { computed, onUnmounted, reactive, ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import { type CustomerRealnameStatus, useAuthStore } from '@/stores/auth';
import { maskPhone } from '@/utils/format';
import NavBar from '@/components/common/NavBar.vue';

const auth = useAuthStore();

const realnameMap: Record<CustomerRealnameStatus, { label: string; className: string }> = {
  unverified: { label: '未实名', className: 'security__tag--warn' },
  pending: { label: '审核中', className: 'security__tag--info' },
  verified: { label: '已实名', className: 'security__tag--ok' },
  failed: { label: '认证失败', className: 'security__tag--danger' },
};

const mobilePanelOpen = ref(false);
const sending = ref(false);
const submitting = ref(false);
const loggingOut = ref(false);
const smsRemaining = ref(0);
const form = reactive({ mobile: '', code: '' });

let smsTimer: ReturnType<typeof setInterval> | null = null;

const maskedMobile = computed(() => maskPhone(auth.mobile) || '未绑定手机号');
const realnameMeta = computed(() => realnameMap[auth.realnameStatus]);
const mobileValid = computed(() => /^1[3-9]\d{9}$/.test(form.mobile));
const codeValid = computed(() => /^\d{6}$/.test(form.code));
const canSubmit = computed(() => mobileValid.value && codeValid.value && !submitting.value);

function startTimer(seconds: number): void {
  smsRemaining.value = seconds;
  if (smsTimer) clearInterval(smsTimer);
  smsTimer = setInterval(() => {
    smsRemaining.value -= 1;
    if (smsRemaining.value <= 0 && smsTimer) {
      clearInterval(smsTimer);
      smsTimer = null;
    }
  }, 1000);
}

function toggleMobilePanel(): void {
  mobilePanelOpen.value = !mobilePanelOpen.value;
}

async function sendCode(): Promise<void> {
  if (!mobileValid.value) {
    uni.showToast({ title: '请输入正确手机号', icon: 'none' });
    return;
  }
  if (smsRemaining.value > 0 || sending.value) return;
  sending.value = true;
  try {
    await auth.sendSms(form.mobile, 'change-mobile');
    startTimer(60);
    uni.showToast({ title: '验证码已发送', icon: 'success' });
  } catch (err) {
    uni.showToast({ title: err instanceof Error ? err.message : '验证码发送失败', icon: 'none' });
  } finally {
    sending.value = false;
  }
}

async function submitMobile(): Promise<void> {
  if (!canSubmit.value) {
    uni.showToast({ title: '请填写手机号和验证码', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    await auth.changeMobile(form.mobile, form.code);
    form.mobile = '';
    form.code = '';
    mobilePanelOpen.value = false;
    uni.showToast({ title: '手机号已修改', icon: 'success' });
  } catch (err) {
    uni.showToast({ title: err instanceof Error ? err.message : '手机号修改失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}

function goProfileEdit(): void {
  uni.navigateTo({ url: '/pages/me/profile-edit' });
}

function goRealname(): void {
  uni.navigateTo({ url: '/pages/profile/realname' });
}

async function onLogout(): Promise<void> {
  if (loggingOut.value) return;
  loggingOut.value = true;
  try {
    await auth.logout();
    uni.reLaunch({ url: '/pages/login/index' });
  } finally {
    loggingOut.value = false;
  }
}

onUnmounted(() => {
  if (smsTimer) clearInterval(smsTimer);
});
</script>

<template>
  <view class="security">
    <NavBar title="账号安全" />
    <view class="security__summary">
      <view class="security__icon">
        <SvgIcon name="shield-check" :size="46" color="var(--brand-primary)" />
      </view>
      <view class="security__summary-main">
        <text class="security__name">账号安全</text>
        <text class="security__mobile">{{ maskedMobile }}</text>
      </view>
      <view class="security__tag" :class="realnameMeta.className">{{ realnameMeta.label }}</view>
    </view>

    <view class="security__card">
      <view class="security__row" @tap="toggleMobilePanel">
        <view class="security__row-left">
          <SvgIcon name="phone" :size="30" color="var(--text-primary)" />
          <view class="security__row-text">
            <text class="security__row-title">修改手机号</text>
            <text class="security__row-sub">{{ maskedMobile }}</text>
          </view>
        </view>
        <SvgIcon name="chevron-right" :size="28" color="#b6bfcd" />
      </view>

      <view v-if="mobilePanelOpen" class="security__mobile-panel">
        <input
          v-model="form.mobile"
          class="security__input"
          type="number"
          maxlength="11"
          placeholder="请输入新手机号"
        />
        <view class="security__sms-row">
          <input
            v-model="form.code"
            class="security__input security__sms-input"
            type="number"
            maxlength="6"
            placeholder="验证码"
          />
          <view class="security__sms-btn" :class="{ 'security__sms-btn--disabled': smsRemaining > 0 }" @tap="sendCode">
            {{ smsRemaining > 0 ? `${smsRemaining}s` : sending ? '发送中' : '获取验证码' }}
          </view>
        </view>
        <view class="security__submit" :class="{ 'security__submit--disabled': !canSubmit }" @tap="submitMobile">
          {{ submitting ? '提交中' : '确认修改' }}
        </view>
      </view>

      <view class="security__row" @tap="goRealname">
        <view class="security__row-left">
          <SvgIcon name="shield-check" :size="30" color="var(--text-primary)" />
          <view class="security__row-text">
            <text class="security__row-title">实名认证</text>
            <text class="security__row-sub">{{ realnameMeta.label }}</text>
          </view>
        </view>
        <SvgIcon name="chevron-right" :size="28" color="#b6bfcd" />
      </view>

      <view class="security__row" @tap="goProfileEdit">
        <view class="security__row-left">
          <SvgIcon name="user" :size="30" color="var(--text-primary)" />
          <view class="security__row-text">
            <text class="security__row-title">个人资料</text>
            <text class="security__row-sub">头像、昵称和简介</text>
          </view>
        </view>
        <SvgIcon name="chevron-right" :size="28" color="#b6bfcd" />
      </view>
    </view>

    <view class="security__logout" @tap="onLogout">
      <SvgIcon name="lock" :size="28" />
      <text>{{ loggingOut ? '退出中' : '退出登录' }}</text>
    </view>
  </view>
</template>

<style scoped>
.security {
  min-height: 100vh;
  padding: 28rpx 24rpx 80rpx;
  box-sizing: border-box;
  background: #fff;
  color: var(--text-primary);
}

.security__summary,
.security__card,
.security__logout {
  background: #fff;
  border: 1rpx solid #edf0f5;
  box-shadow: 0 14rpx 38rpx rgba(23, 32, 51, 0.06);
}

.security__summary {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx;
  border-radius: 24rpx;
}

.security__icon {
  width: 84rpx;
  height: 84rpx;
  border-radius: 42rpx;
  border: 1rpx solid #e8ecf2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.security__summary-main,
.security__row-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.security__summary-main {
  flex: 1;
}

.security__name {
  font-size: 34rpx;
  font-weight: 800;
}

.security__mobile,
.security__row-sub {
  margin-top: 4rpx;
  font-size: 23rpx;
  color: var(--text-muted);
}

.security__tag {
  min-height: 44rpx;
  padding: 0 16rpx;
  border: 1rpx solid #e8ecf2;
  border-radius: 999rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 700;
}

.security__tag--ok {
  color: #11998e;
  border-color: rgba(17, 153, 142, 0.36);
}

.security__tag--warn,
.security__tag--info {
  color: var(--brand-primary);
  border-color: rgba(46, 156, 93, 0.36);
}

.security__tag--danger {
  color: var(--price-color);
  border-color: rgba(255, 77, 79, 0.36);
}

.security__card {
  margin-top: 18rpx;
  padding: 0 24rpx;
  border-radius: 24rpx;
}

.security__row {
  min-height: 108rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  border-bottom: 1rpx solid #f0f2f6;
}

.security__row:last-child {
  border-bottom: none;
}

.security__row-left {
  display: flex;
  align-items: center;
  gap: 18rpx;
  min-width: 0;
}

.security__row-title {
  font-size: 28rpx;
  font-weight: 800;
}

.security__mobile-panel {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 8rpx 0 24rpx;
  border-bottom: 1rpx solid #f0f2f6;
}

.security__input {
  width: 100%;
  height: 78rpx;
  padding: 0 22rpx;
  box-sizing: border-box;
  border: 1rpx solid #e8ecf2;
  border-radius: 16rpx;
  background: #fff;
  color: var(--text-primary);
  font-size: 28rpx;
}

.security__sms-row {
  display: flex;
  gap: 14rpx;
}

.security__sms-input {
  flex: 1;
}

.security__sms-btn,
.security__submit {
  min-height: 78rpx;
  padding: 0 24rpx;
  border-radius: 16rpx;
  border: 1rpx solid rgba(46, 156, 93, 0.52);
  background: #fff;
  color: var(--brand-primary);
  font-size: 25rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.security__sms-btn--disabled,
.security__submit--disabled {
  color: #9aa3b2;
  border-color: #e8ecf2;
}

.security__logout {
  min-height: 88rpx;
  margin-top: 18rpx;
  border-radius: 22rpx;
  border-color: rgba(255, 77, 79, 0.28);
  color: var(--price-color);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 28rpx;
  font-weight: 800;
}
</style>
