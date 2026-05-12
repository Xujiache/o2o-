<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed, onUnmounted, reactive, ref } from 'vue';

import { uploadFile } from '@/api';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { type CustomerGender, type CustomerRealnameStatus, useAuthStore } from '@/stores/auth';
import { maskPhone } from '@/utils/format';

const auth = useAuthStore();

const genderOptions: Array<{ label: string; value: CustomerGender }> = [
  { label: '不展示', value: 'unknown' },
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
];

const realnameMap: Record<CustomerRealnameStatus, { label: string; className: string }> = {
  unverified: { label: '未实名', className: 'edit__tag--warn' },
  pending: { label: '审核中', className: 'edit__tag--info' },
  verified: { label: '已实名', className: 'edit__tag--ok' },
  failed: { label: '认证失败', className: 'edit__tag--danger' },
};

const genderRange = genderOptions.map((item) => item.label);
const saving = ref(false);
const uploadingAvatar = ref(false);
const loggingOut = ref(false);
const mobilePanelOpen = ref(false);
const sendingMobileCode = ref(false);
const changingMobile = ref(false);
const smsRemaining = ref(0);

const form = reactive({
  nickname: '',
  avatarUrl: '',
  gender: 'unknown' as CustomerGender,
  birthday: '',
  bio: '',
});

const mobileForm = reactive({
  mobile: '',
  code: '',
});

let smsTimer: ReturnType<typeof setInterval> | null = null;

const displayName = computed(() => form.nickname.trim() || auth.profile.nickname.trim() || '用户');
const avatarLetter = computed(() => displayName.value.slice(0, 1).toUpperCase());
const maskedMobile = computed(() => maskPhone(auth.mobile) || '未绑定手机号');
const realnameMeta = computed(() => realnameMap[auth.realnameStatus]);
const genderIndex = computed(() => {
  const index = genderOptions.findIndex((item) => item.value === form.gender);
  return index >= 0 ? index : 0;
});
const mobileValid = computed(() => /^1[3-9]\d{9}$/.test(mobileForm.mobile));
const mobileCodeValid = computed(() => /^\d{6}$/.test(mobileForm.code));
const canChangeMobile = computed(() => mobileValid.value && mobileCodeValid.value && !changingMobile.value);

function initForm(): void {
  form.nickname = auth.profile.nickname;
  form.avatarUrl = auth.profile.avatarUrl;
  form.gender = auth.profile.gender;
  form.birthday = auth.profile.birthday;
  form.bio = auth.profile.bio;
}

function ensureLoggedIn(): boolean {
  if (!auth.isLoggedIn) {
    uni.reLaunch({ url: '/pages/login/index' });
    return false;
  }
  return true;
}

function startSmsTimer(seconds: number): void {
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

function chooseAvatar(): void {
  if (uploadingAvatar.value) return;
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (res) => {
      const paths = Array.isArray(res.tempFilePaths) ? res.tempFilePaths : [];
      const filePath = paths[0];
      if (!filePath) return;
      uploadingAvatar.value = true;
      try {
        const r = await uploadFile(filePath, 'avatar');
        if (r.code !== '0' || !r.data?.url) {
          throw new Error(r.message || '头像上传失败');
        }
        form.avatarUrl = r.data.url;
        uni.showToast({ title: '头像已上传', icon: 'success' });
      } catch (err) {
        uni.showToast({ title: err instanceof Error ? err.message : '头像上传失败', icon: 'none' });
      } finally {
        uploadingAvatar.value = false;
      }
    },
  });
}

function clearAvatar(): void {
  form.avatarUrl = '';
}

function onGenderChange(event: { detail: { value: number | string } }): void {
  const index = Number(event.detail.value);
  form.gender = genderOptions[index]?.value || 'unknown';
}

function onBirthdayChange(event: { detail: { value: string } }): void {
  form.birthday = event.detail.value;
}

function goRealname(): void {
  uni.navigateTo({ url: '/pages/profile/realname' });
}

function openMobilePanel(): void {
  mobilePanelOpen.value = !mobilePanelOpen.value;
}

async function sendMobileCode(): Promise<void> {
  if (!mobileValid.value) {
    uni.showToast({ title: '请输入正确手机号', icon: 'none' });
    return;
  }
  if (smsRemaining.value > 0 || sendingMobileCode.value) return;
  sendingMobileCode.value = true;
  try {
    await auth.sendSms(mobileForm.mobile, 'change-mobile');
    startSmsTimer(60);
    uni.showToast({ title: '验证码已发送', icon: 'success' });
  } catch (err) {
    uni.showToast({ title: err instanceof Error ? err.message : '验证码发送失败', icon: 'none' });
  } finally {
    sendingMobileCode.value = false;
  }
}

async function submitMobileChange(): Promise<void> {
  if (!canChangeMobile.value) {
    uni.showToast({ title: '请填写手机号和验证码', icon: 'none' });
    return;
  }
  changingMobile.value = true;
  try {
    await auth.changeMobile(mobileForm.mobile, mobileForm.code);
    mobilePanelOpen.value = false;
    mobileForm.mobile = '';
    mobileForm.code = '';
    uni.showToast({ title: '手机号已修改', icon: 'success' });
  } catch (err) {
    uni.showToast({ title: err instanceof Error ? err.message : '手机号修改失败', icon: 'none' });
  } finally {
    changingMobile.value = false;
  }
}

async function saveProfile(): Promise<void> {
  const nickname = form.nickname.trim();
  if (!nickname) {
    uni.showToast({ title: '请输入昵称', icon: 'none' });
    return;
  }
  saving.value = true;
  try {
    await auth.saveProfile({
      nickname,
      avatarUrl: form.avatarUrl,
      gender: form.gender,
      birthday: form.birthday,
      bio: form.bio.trim(),
    });
    uni.showToast({ title: '资料已保存', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 350);
  } catch (err) {
    uni.showToast({ title: err instanceof Error ? err.message : '资料保存失败', icon: 'none' });
  } finally {
    saving.value = false;
  }
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

ensureLoggedIn();
initForm();

onShow(async () => {
  await auth.syncProfile().catch(() => undefined);
  initForm();
});

onUnmounted(() => {
  if (smsTimer) clearInterval(smsTimer);
});
</script>

<template>
  <view class="edit">
    <view class="edit__avatar-block">
      <view class="edit__avatar">
        <image v-if="form.avatarUrl" class="edit__avatar-image" :src="form.avatarUrl" mode="aspectFill" />
        <text v-else class="edit__avatar-letter">{{ avatarLetter }}</text>
      </view>
      <view class="edit__avatar-actions">
        <view class="edit__outline-btn" @tap="chooseAvatar">
          <SvgIcon name="image" :size="26" />
          <text>{{ uploadingAvatar ? '上传中' : '选择头像' }}</text>
        </view>
        <view class="edit__outline-btn" @tap="clearAvatar">
          <SvgIcon name="x" :size="24" />
          <text>清除</text>
        </view>
      </view>
    </view>

    <view class="edit__card">
      <view class="edit__field">
        <text class="edit__field-label">昵称</text>
        <input v-model="form.nickname" class="edit__input" maxlength="64" placeholder="请输入昵称" />
      </view>
      <view class="edit__field-row">
        <view class="edit__field edit__field--half">
          <text class="edit__field-label">性别</text>
          <picker :range="genderRange" :value="genderIndex" @change="onGenderChange">
            <view class="edit__picker-value">{{ genderOptions[genderIndex]?.label || '不展示' }}</view>
          </picker>
        </view>
        <view class="edit__field edit__field--half">
          <text class="edit__field-label">生日</text>
          <picker mode="date" :value="form.birthday" @change="onBirthdayChange">
            <view class="edit__picker-value" :class="{ 'edit__picker-value--empty': !form.birthday }">
              {{ form.birthday || '请选择' }}
            </view>
          </picker>
        </view>
      </view>
      <view class="edit__field">
        <text class="edit__field-label">个人简介</text>
        <textarea
          v-model="form.bio"
          class="edit__textarea"
          maxlength="120"
          placeholder="写一句常用偏好或备注"
          :show-confirm-bar="false"
        />
      </view>
    </view>

    <view class="edit__card edit__card--readonly">
      <view class="edit__readonly-row" @tap="openMobilePanel">
        <view class="edit__readonly-left">
          <SvgIcon name="phone" :size="28" color="#172033" />
          <text class="edit__readonly-label">手机号</text>
        </view>
        <view class="edit__readonly-right">
          <text class="edit__readonly-value">{{ maskedMobile }}</text>
          <SvgIcon name="chevron-right" :size="28" color="#b6bfcd" />
        </view>
      </view>

      <view v-if="mobilePanelOpen" class="edit__mobile-panel">
        <input
          v-model="mobileForm.mobile"
          class="edit__input"
          type="number"
          maxlength="11"
          placeholder="请输入新手机号"
        />
        <view class="edit__sms-row">
          <input
            v-model="mobileForm.code"
            class="edit__input edit__sms-input"
            type="number"
            maxlength="6"
            placeholder="验证码"
          />
          <view class="edit__sms-btn" :class="{ 'edit__sms-btn--disabled': smsRemaining > 0 }" @tap="sendMobileCode">
            {{ smsRemaining > 0 ? `${smsRemaining}s` : sendingMobileCode ? '发送中' : '获取验证码' }}
          </view>
        </view>
        <view
          class="edit__mobile-submit"
          :class="{ 'edit__mobile-submit--disabled': !canChangeMobile }"
          @tap="submitMobileChange"
        >
          {{ changingMobile ? '提交中' : '确认修改' }}
        </view>
      </view>

      <view class="edit__readonly-row" @tap="goRealname">
        <view class="edit__readonly-left">
          <SvgIcon name="shield-check" :size="28" color="#172033" />
          <text class="edit__readonly-label">实名状态</text>
        </view>
        <view class="edit__readonly-tag" :class="realnameMeta.className">{{ realnameMeta.label }}</view>
      </view>
    </view>

    <view class="edit__logout" @tap="onLogout">
      <SvgIcon name="lock" :size="28" />
      <text>{{ loggingOut ? '退出中' : '退出登录' }}</text>
    </view>

    <view class="edit__footer">
      <view class="edit__save-btn" @tap="saveProfile">{{ saving ? '保存中' : '保存资料' }}</view>
    </view>
  </view>
</template>

<style scoped>
.edit {
  min-height: 100vh;
  padding: 28rpx 24rpx 160rpx;
  box-sizing: border-box;
  background: #fff;
  color: #172033;
}

.edit__avatar-block {
  display: flex;
  align-items: center;
  gap: 28rpx;
  margin-bottom: 24rpx;
}

.edit__avatar {
  width: 136rpx;
  height: 136rpx;
  border-radius: 68rpx;
  background: #fff;
  border: 2rpx solid #e8ecf2;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.edit__avatar-image {
  width: 100%;
  height: 100%;
}

.edit__avatar-letter {
  font-size: 42rpx;
  font-weight: 800;
  color: #ff6b35;
}

.edit__avatar-actions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.edit__outline-btn {
  min-height: 58rpx;
  padding: 0 22rpx;
  border: 1rpx solid #e8ecf2;
  border-radius: 999rpx;
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  background: #fff;
  color: #172033;
  font-size: 24rpx;
  font-weight: 700;
}

.edit__card {
  margin-top: 18rpx;
  padding: 24rpx;
  border-radius: 22rpx;
  background: #fff;
  border: 1rpx solid #edf0f5;
  box-shadow: 0 14rpx 38rpx rgba(23, 32, 51, 0.06);
}

.edit__card--readonly {
  padding: 0 24rpx;
}

.edit__field {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  margin-bottom: 20rpx;
  min-width: 0;
}

.edit__field:last-child {
  margin-bottom: 0;
}

.edit__field-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.edit__field--half {
  flex: 1;
  margin-bottom: 0;
}

.edit__field-label {
  font-size: 23rpx;
  color: #8a94a6;
  font-weight: 700;
}

.edit__input,
.edit__textarea,
.edit__picker-value {
  width: 100%;
  box-sizing: border-box;
  border: 1rpx solid #e8ecf2;
  border-radius: 16rpx;
  background: #fff;
  color: #172033;
  font-size: 28rpx;
}

.edit__input,
.edit__picker-value {
  height: 78rpx;
  padding: 0 22rpx;
  line-height: 78rpx;
}

.edit__textarea {
  height: 132rpx;
  padding: 20rpx 22rpx;
  line-height: 1.45;
}

.edit__picker-value--empty,
.edit__input::placeholder,
.edit__textarea::placeholder {
  color: #b6bfcd;
}

.edit__readonly-row {
  min-height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  border-bottom: 1rpx solid #f0f2f6;
}

.edit__readonly-row:last-child {
  border-bottom: none;
}

.edit__readonly-left,
.edit__readonly-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.edit__readonly-label,
.edit__readonly-value {
  font-size: 27rpx;
  color: #172033;
}

.edit__readonly-value {
  font-weight: 700;
}

.edit__readonly-tag {
  min-height: 44rpx;
  padding: 0 16rpx;
  border: 1rpx solid #e8ecf2;
  border-radius: 999rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 700;
  background: #fff;
}

.edit__tag--ok {
  color: #11998e;
  border-color: rgba(17, 153, 142, 0.36);
}

.edit__tag--warn,
.edit__tag--info {
  color: #ff7a45;
  border-color: rgba(255, 122, 69, 0.36);
}

.edit__tag--danger {
  color: #ff4d4f;
  border-color: rgba(255, 77, 79, 0.36);
}

.edit__mobile-panel {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 8rpx 0 24rpx;
  border-bottom: 1rpx solid #f0f2f6;
}

.edit__sms-row {
  display: flex;
  gap: 14rpx;
}

.edit__sms-input {
  flex: 1;
}

.edit__sms-btn,
.edit__mobile-submit {
  min-height: 78rpx;
  padding: 0 24rpx;
  border-radius: 16rpx;
  border: 1rpx solid rgba(255, 107, 53, 0.52);
  background: #fff;
  color: #ff6b35;
  font-size: 25rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.edit__sms-btn--disabled,
.edit__mobile-submit--disabled {
  color: #9aa3b2;
  border-color: #e8ecf2;
}

.edit__logout {
  min-height: 88rpx;
  margin-top: 18rpx;
  border: 1rpx solid rgba(255, 77, 79, 0.28);
  border-radius: 22rpx;
  background: #fff;
  color: #ff4d4f;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 28rpx;
  font-weight: 800;
}

.edit__footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 24rpx calc(env(safe-area-inset-bottom, 0rpx) + 20rpx);
  background: #fff;
  border-top: 1rpx solid #edf0f5;
}

.edit__save-btn {
  height: 84rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 800;
  color: #ff6b35;
  background: #fff;
  border: 1rpx solid rgba(255, 107, 53, 0.52);
}
</style>
