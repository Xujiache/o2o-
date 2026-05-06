<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { getOnboardingStatus, getProfile, reportLocationBatch, updateOnlineStatus, type RiderProfileVo } from '@/api';

const onlineStatus = ref<'online' | 'offline'>('offline');
const profile = ref<RiderProfileVo | null>(null);
const approved = ref(false);
const loading = ref(false);
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

const canGoOnline = computed(() => {
  if (!profile.value || !approved.value) return false;
  if (profile.value.accountStatus !== 'active') return false;
  if (profile.value.healthCertExpiry && Number(profile.value.healthCertExpiry) < Date.now()) return false;
  return true;
});

const reasonText = computed(() => {
  if (!profile.value) return '';
  if (!approved.value) return '入驻审核未通过,无法上线';
  if (profile.value.accountStatus !== 'active') return '账号已被禁用';
  if (profile.value.healthCertExpiry && Number(profile.value.healthCertExpiry) < Date.now()) return '健康证已过期';
  return '';
});

async function refreshProfile(): Promise<void> {
  const [p, s] = await Promise.all([getProfile(), getOnboardingStatus()]);
  if (p.code === '0' && p.data) profile.value = p.data;
  if (s.code === '0' && s.data) approved.value = s.data.auditStatus === 'approved';
}

async function toggleOnline(): Promise<void> {
  if (loading.value) return;
  if (onlineStatus.value === 'offline' && !canGoOnline.value) {
    uni.showToast({ icon: 'none', title: reasonText.value });
    return;
  }
  loading.value = true;
  try {
    const target = onlineStatus.value === 'offline' ? 'online' : 'offline';
    const r = await updateOnlineStatus({
      targetStatus: target,
      deviceToken: `mock-${profile.value?.riderId ?? 'x'}`,
      platform: 'android',
    });
    if (r.code === '0' && r.data) {
      onlineStatus.value = r.data.riderStatus === 'online' ? 'online' : 'offline';
      if (onlineStatus.value === 'online') startHeartbeat();
      else stopHeartbeat();
    } else {
      uni.showToast({ icon: 'none', title: r.message || '操作失败' });
    }
  } finally {
    loading.value = false;
  }
}

function startHeartbeat(): void {
  stopHeartbeat();
  heartbeatTimer = setInterval(async () => {
    try {
      // mock 位置:固定北京坐标(真定位接入留 stage 8)
      await reportLocationBatch({
        batchId: `b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        points: [{ lng: 116.4 + Math.random() * 0.01, lat: 39.9 + Math.random() * 0.01, reportedAt: Date.now() }],
      });
    } catch {
      /* ignore */
    }
  }, 30000);
}

function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

onMounted(refreshProfile);
onUnmounted(stopHeartbeat);

function gotoTasks(): void {
  uni.navigateTo({ url: '/pages/tasks/available' });
}
function gotoProfile(): void {
  uni.navigateTo({ url: '/pages/profile/index' });
}
</script>

<template>
  <view class="wb">
    <view class="wb__title">骑手工作台</view>
    <view v-if="profile" class="wb__card">
      <view class="wb__row">
        <text>姓名</text>
        <text>{{ profile.realName ?? '未审核' }}</text>
      </view>
      <view class="wb__row">
        <text>状态</text>
        <text :class="`wb__status--${onlineStatus}`">{{ onlineStatus === 'online' ? '在线' : '离线' }}</text>
      </view>
      <view class="wb__row">
        <text>信用分</text>
        <text>{{ profile.creditScore }}</text>
      </view>
    </view>
    <button class="wb__btn" :class="{ 'wb__btn--off': onlineStatus === 'online' }" @click="toggleOnline">
      {{ onlineStatus === 'online' ? '下线' : '上线' }}
    </button>
    <text v-if="onlineStatus === 'offline' && reasonText" class="wb__hint">{{ reasonText }}</text>
    <view class="wb__entries">
      <view class="wb__entry" @click="gotoTasks">接单大厅</view>
      <view class="wb__entry" @click="uni.navigateTo({ url: '/pages/tasks/current' })">当前任务</view>
      <view class="wb__entry" @click="uni.navigateTo({ url: '/pages/earnings/index' })">收益中心</view>
      <view class="wb__entry" @click="uni.navigateTo({ url: '/pages/withdrawals/form' })">提现</view>
      <view class="wb__entry" @click="uni.navigateTo({ url: '/pages/withdrawals/records' })">提现记录</view>
      <view class="wb__entry" @click="uni.navigateTo({ url: '/pages/assessment/index' })">考核中心</view>
      <view class="wb__entry" @click="uni.navigateTo({ url: '/pages/violations/index' })">违规记录</view>
      <view class="wb__entry" @click="gotoProfile">个人资料</view>
    </view>
  </view>
</template>

<style scoped>
.wb {
  padding: 32rpx;
}
.wb__title {
  font-size: 40rpx;
  font-weight: 600;
}
.wb__card {
  background: #fff;
  border-radius: 12rpx;
  padding: 32rpx;
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.wb__row {
  display: flex;
  justify-content: space-between;
  font-size: 28rpx;
}
.wb__status--online {
  color: #52c41a;
  font-weight: 600;
}
.wb__status--offline {
  color: #999;
}
.wb__btn {
  margin-top: 32rpx;
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
.wb__btn--off {
  background: #ff4d4f;
}
.wb__hint {
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: #ff4d4f;
  margin-top: 16rpx;
}
.wb__entries {
  margin-top: 32rpx;
  display: flex;
  gap: 16rpx;
}
.wb__entry {
  flex: 1;
  background: #fff;
  border-radius: 12rpx;
  padding: 32rpx;
  text-align: center;
  font-size: 28rpx;
}
</style>
