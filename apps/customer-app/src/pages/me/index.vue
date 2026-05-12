<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed } from 'vue';

import FloatTabBar from '@/components/common/FloatTabBar.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { type CustomerRealnameStatus, useAuthStore } from '@/stores/auth';
import { maskPhone } from '@/utils/format';

type EntryKey = 'orders' | 'coupons' | 'notifications' | 'address' | 'security' | 'realname';

interface EntryItem {
  key: EntryKey;
  label: string;
  icon: string;
}

const auth = useAuthStore();

const realnameMap: Record<CustomerRealnameStatus, { label: string; className: string }> = {
  unverified: { label: '未实名', className: 'me__tag--warn' },
  pending: { label: '审核中', className: 'me__tag--info' },
  verified: { label: '已实名', className: 'me__tag--ok' },
  failed: { label: '认证失败', className: 'me__tag--danger' },
};

const quickEntries: EntryItem[] = [
  { key: 'orders', label: '订单', icon: 'clipboard' },
  { key: 'address', label: '地址', icon: 'location-pin' },
  { key: 'realname', label: '实名', icon: 'shield-check' },
  { key: 'security', label: '安全', icon: 'lock' },
];

const serviceEntries: EntryItem[] = [
  { key: 'coupons', label: '我的优惠券', icon: 'ticket' },
  { key: 'notifications', label: '消息设置', icon: 'bell' },
];

const profile = computed(() => auth.profile);
const displayName = computed(() => profile.value.nickname.trim() || '用户');
const avatarLetter = computed(() => displayName.value.slice(0, 1).toUpperCase());
const maskedMobile = computed(() => maskPhone(auth.mobile) || '未绑定手机号');
const realnameMeta = computed(() => realnameMap[auth.realnameStatus]);

const profileItems = computed(() => [
  Boolean(profile.value.nickname.trim()),
  Boolean(profile.value.avatarUrl),
  profile.value.gender !== 'unknown',
  Boolean(profile.value.birthday),
  Boolean(auth.mobile),
  auth.realnameStatus === 'verified',
]);

const completionCount = computed(() => profileItems.value.filter(Boolean).length);
const completionText = computed(() => `${completionCount.value}/${profileItems.value.length}`);
const completionPercent = computed(() => Math.round((completionCount.value / profileItems.value.length) * 100));

function ensureLoggedIn(): boolean {
  if (!auth.isLoggedIn) {
    uni.reLaunch({ url: '/pages/login/index' });
    return false;
  }
  return true;
}

function editProfile(): void {
  uni.navigateTo({ url: '/pages/me/profile-edit' });
}

function navigateByKey(key: EntryKey): void {
  if (key === 'orders') {
    uni.switchTab({ url: '/pages/food/order/list' });
    return;
  }
  if (key === 'coupons') {
    uni.navigateTo({ url: '/pages/me/coupons' });
    return;
  }
  if (key === 'notifications') {
    uni.navigateTo({ url: '/pages/me/notification' });
    return;
  }
  if (key === 'address') {
    uni.navigateTo({ url: '/pages/address/list' });
    return;
  }
  if (key === 'security') {
    uni.navigateTo({ url: '/pages/me/profile-edit' });
    return;
  }
  uni.navigateTo({ url: '/pages/profile/realname' });
}

ensureLoggedIn();

onShow(async () => {
  uni.hideTabBar({ animation: false });
  await auth.syncProfile().catch(() => undefined);
});
</script>

<template>
  <view class="me">
    <view class="me__profile-card" @tap="editProfile">
      <view class="me__profile-main">
        <view class="me__avatar">
          <image v-if="profile.avatarUrl" class="me__avatar-image" :src="profile.avatarUrl" mode="aspectFill" />
          <text v-else class="me__avatar-letter">{{ avatarLetter }}</text>
        </view>
        <view class="me__profile-body">
          <view class="me__name-row">
            <text class="me__name">{{ displayName }}</text>
            <view class="me__edit-pill">
              <SvgIcon name="file-edit" :size="22" />
              <text>编辑</text>
            </view>
          </view>
          <text class="me__bio">{{ profile.bio || '点击完善头像、昵称和资料' }}</text>
          <view class="me__meta-row">
            <view class="me__meta-pill">
              <SvgIcon name="phone" :size="22" />
              <text>{{ maskedMobile }}</text>
            </view>
            <view class="me__meta-pill" :class="realnameMeta.className" @tap.stop="navigateByKey('realname')">
              <SvgIcon name="shield-check" :size="22" />
              <text>{{ realnameMeta.label }}</text>
            </view>
          </view>
        </view>
        <SvgIcon name="chevron-right" :size="32" color="#9aa3b2" />
      </view>

      <view class="me__completion">
        <view class="me__completion-head">
          <text>资料完整度</text>
          <text>{{ completionText }}</text>
        </view>
        <view class="me__progress">
          <view class="me__progress-fill" :style="`width: ${completionPercent}%`" />
        </view>
      </view>
    </view>

    <view class="me__quick-grid">
      <view v-for="item in quickEntries" :key="item.key" class="me__quick-item" @tap="navigateByKey(item.key)">
        <view class="me__quick-icon">
          <SvgIcon :name="item.icon" :size="34" color="#ff6b35" />
        </view>
        <text class="me__quick-label">{{ item.label }}</text>
      </view>
    </view>

    <view class="me__section">
      <view class="me__section-head">
        <text class="me__section-title">常用服务</text>
      </view>
      <view class="me__info-list">
        <view v-for="item in serviceEntries" :key="item.key" class="me__info-row" @tap="navigateByKey(item.key)">
          <view class="me__info-left">
            <SvgIcon :name="item.icon" :size="30" color="#172033" />
            <text class="me__info-title">{{ item.label }}</text>
          </view>
          <SvgIcon name="chevron-right" :size="28" color="#b6bfcd" />
        </view>
      </view>
    </view>

    <FloatTabBar active="me" />
  </view>
</template>

<style scoped>
.me {
  min-height: 100vh;
  padding: 24rpx 24rpx 220rpx;
  box-sizing: border-box;
  background: #fff;
  color: #172033;
}

.me__profile-card,
.me__quick-grid,
.me__section {
  background: #fff;
  border: 1rpx solid #edf0f5;
  box-shadow: 0 14rpx 38rpx rgba(23, 32, 51, 0.06);
}

.me__profile-card {
  padding: 30rpx 28rpx;
  border-radius: 24rpx;
}

.me__profile-main {
  display: flex;
  align-items: center;
  gap: 22rpx;
}

.me__avatar {
  width: 104rpx;
  height: 104rpx;
  border-radius: 52rpx;
  background: #fff;
  border: 2rpx solid #e8ecf2;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.me__avatar-image {
  width: 100%;
  height: 100%;
}

.me__avatar-letter {
  font-size: 38rpx;
  font-weight: 800;
  color: #ff6b35;
}

.me__profile-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  min-width: 0;
}

.me__name-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  min-width: 0;
}

.me__name {
  max-width: 300rpx;
  font-size: 34rpx;
  font-weight: 800;
  color: #172033;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.me__edit-pill,
.me__meta-pill,
.me__row-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  flex-shrink: 0;
  background: #fff;
  border: 1rpx solid #e8ecf2;
  border-radius: 999rpx;
}

.me__edit-pill {
  min-height: 40rpx;
  padding: 0 12rpx;
  font-size: 22rpx;
  color: #ff6b35;
  border-color: rgba(255, 107, 53, 0.32);
}

.me__bio {
  font-size: 24rpx;
  color: #6b7280;
  line-height: 1.45;
}

.me__meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.me__meta-pill {
  min-height: 42rpx;
  padding: 0 14rpx;
  font-size: 22rpx;
  color: #606b7b;
}

.me__tag--ok {
  color: #11998e;
  border-color: rgba(17, 153, 142, 0.36);
}

.me__tag--warn,
.me__tag--info {
  color: #ff7a45;
  border-color: rgba(255, 122, 69, 0.36);
}

.me__tag--danger {
  color: #ff4d4f;
  border-color: rgba(255, 77, 79, 0.36);
}

.me__completion {
  margin-top: 24rpx;
}

.me__completion-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
  font-size: 23rpx;
  color: #8a94a6;
}

.me__progress {
  height: 10rpx;
  background: #fff;
  border: 1rpx solid #e8ecf2;
  border-radius: 999rpx;
  overflow: hidden;
}

.me__progress-fill {
  height: 100%;
  background: #ff6b35;
  border-radius: 999rpx;
  transition: width 240ms ease;
}

.me__quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10rpx;
  margin-top: 18rpx;
  padding: 22rpx 12rpx;
  border-radius: 22rpx;
}

.me__quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}

.me__quick-icon {
  width: 66rpx;
  height: 66rpx;
  border-radius: 22rpx;
  background: #fff;
  border: 1rpx solid #edf0f5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10rpx;
}

.me__quick-label {
  font-size: 25rpx;
  font-weight: 700;
  color: #172033;
}

.me__section {
  margin-top: 18rpx;
  padding: 26rpx 26rpx 8rpx;
  border-radius: 22rpx;
}

.me__section-head {
  margin-bottom: 8rpx;
}

.me__section-title {
  font-size: 30rpx;
  font-weight: 800;
  color: #172033;
}

.me__info-list {
  display: flex;
  flex-direction: column;
}

.me__info-row {
  min-height: 104rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  border-bottom: 1rpx solid #f0f2f6;
}

.me__info-row:last-child {
  border-bottom: none;
}

.me__info-left {
  display: flex;
  align-items: center;
  gap: 18rpx;
  min-width: 0;
}

.me__info-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
}
</style>
