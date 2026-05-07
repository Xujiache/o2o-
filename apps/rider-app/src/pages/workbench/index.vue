<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { getOnboardingStatus, getProfile, reportLocationBatch, updateOnlineStatus, type RiderProfileVo } from '@/api';
import FloatTabBar from '@/components/common/FloatTabBar.vue';
import { locationService } from '@/services/location';

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
  if (p.code === '0' && p.data) {
    profile.value = p.data;
    // 从 server 拿真实在线状态(刷新页面也保留)
    onlineStatus.value = p.data.onlineStatus === 'online' ? 'online' : 'offline';
    if (onlineStatus.value === 'online') startHeartbeat();
  }
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
    const point = target === 'online' ? await locationService.getOnce().catch(() => null) : null;
    const r = await updateOnlineStatus({
      targetStatus: target,
      deviceToken: `mock-${profile.value?.riderId ?? 'x'}`,
      platform: 'android',
      currentLng: point?.longitude,
      currentLat: point?.latitude,
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

async function sendHeartbeat(): Promise<void> {
  try {
    const point = await locationService.getOnce();
    await reportLocationBatch({
      batchId: `b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      points: [
        { lng: point.longitude, lat: point.latitude, accuracy: point.accuracyMeter, reportedAt: point.capturedAt },
      ],
    });
  } catch {
    /* ignore */
  }
}

function startHeartbeat(): void {
  stopHeartbeat();
  // 立即发一次,避免 server 端 60s 心跳超时把骑手改 offline
  void sendHeartbeat();
  heartbeatTimer = setInterval(() => void sendHeartbeat(), 30000);
}

function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

onMounted(refreshProfile);
onUnmounted(stopHeartbeat);
onShow(() => uni.hideTabBar({ animation: false }));

function gotoTasks(): void {
  uni.switchTab({ url: '/pages/tasks/hall' });
}
function gotoProfile(): void {
  uni.switchTab({ url: '/pages/profile/index' });
}
function gotoCurrent(): void {
  uni.switchTab({ url: '/pages/tasks/current' });
}
function gotoEarnings(): void {
  uni.switchTab({ url: '/pages/earnings/index' });
}
function goPage(url: string): void {
  uni.navigateTo({ url });
}
</script>

<template>
  <view class="wb">
    <view class="wb__hero">
      <text class="wb__badge">Rider Console</text>
      <view class="wb__title">骑手工作台</view>
      <text class="wb__subtitle">上线接单、轨迹上报、任务履约统一管理</text>
    </view>
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
      <view class="wb__entry" @click="gotoCurrent">当前任务</view>
      <view class="wb__entry" @click="gotoEarnings">收益中心</view>
      <view class="wb__entry" @click="goPage('/pages/withdrawals/form')">提现</view>
      <view class="wb__entry" @click="goPage('/pages/withdrawals/records')">提现记录</view>
      <view class="wb__entry" @click="goPage('/pages/assessment/index')">考核中心</view>
      <view class="wb__entry" @click="goPage('/pages/violations/index')">违规记录</view>
      <view class="wb__entry" @click="gotoProfile">个人资料</view>
    </view>
    <FloatTabBar active="workbench" />
  </view>
</template>

<style scoped>
.wb {
  padding: 28rpx 24rpx 200rpx;
}
.wb__hero {
  padding: 36rpx;
  border-radius: 34rpx;
  color: #fff;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  box-shadow: 0 24rpx 64rpx rgba(20, 184, 166, 0.26);
}
.wb__badge {
  display: inline-flex;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  font-size: 22rpx;
}
.wb__title {
  margin-top: 20rpx;
  font-size: 46rpx;
  font-weight: 800;
}
.wb__subtitle {
  display: block;
  margin-top: 8rpx;
  color: rgba(255, 255, 255, 0.78);
  font-size: 24rpx;
}
.wb__card {
  background: #fff;
  border-radius: 28rpx;
  padding: 32rpx;
  margin-top: 22rpx;
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
  background: linear-gradient(135deg, #14b8a6, #0f766e);
  color: #fff;
  border-radius: 999rpx;
  font-weight: 700;
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
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}
.wb__entry {
  background: #fff;
  border-radius: 28rpx;
  padding: 32rpx;
  text-align: center;
  font-size: 28rpx;
}
</style>
