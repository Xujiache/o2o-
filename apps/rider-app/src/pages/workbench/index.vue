<script setup lang="ts">
/**
 * 骑手工作台(首页)
 *  - Hero:头像 + 在线/离线状态 + 信用分 + 大开关
 *  - 当前任务卡(若有)
 *  - 今日数据:订单数 / 收益 / 准时率(真实)
 *  - 任务大厅 + 个人资料 入口(避免与底 tabBar 重复)
 */
import { onShow } from '@dcloudio/uni-app';
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { getOnboardingStatus, getProfile, reportLocationBatch, updateOnlineStatus, type RiderProfileVo } from '@/api';
import { getAssessment, type AssessmentVo } from '@/api/rider-assessment';
import { getEarnings, type EarningSummaryVo } from '@/api/rider-earnings';
import { getMyCurrentTask, type RiderTaskDetailVo } from '@/api/rider-tasks';
import FloatTabBar from '@/components/common/FloatTabBar.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { locationService } from '@/services/location';
import { labelRiderTaskStatus } from '@/utils/rider-task-status';

const onlineStatus = ref<'online' | 'offline' | 'busy'>('offline');
const profile = ref<RiderProfileVo | null>(null);
const approved = ref(false);
const auditStatusRaw = ref<string | null>(null);
const loading = ref(false);

const todayEarnings = ref<EarningSummaryVo | null>(null);
const assessment = ref<AssessmentVo | null>(null);
const currentTask = ref<RiderTaskDetailVo | null>(null);

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

const canGoOnline = computed(() => {
  if (!profile.value || !approved.value) return false;
  if (profile.value.accountStatus !== 'active') return false;
  if (profile.value.healthCertExpiry && Number(profile.value.healthCertExpiry) < Date.now()) return false;
  return true;
});

const reasonText = computed(() => {
  if (!profile.value) return '';
  if (!approved.value) {
    if (auditStatusRaw.value === 'rejected') return '入驻审核未通过,请重新提交资料';
    if (auditStatusRaw.value === 'pending') return '入驻审核中,审核通过后可上线';
    return '请先完成入驻申请';
  }
  if (profile.value.accountStatus !== 'active') return '账号已被停用,请联系客服';
  if (profile.value.healthCertExpiry && Number(profile.value.healthCertExpiry) < Date.now()) {
    return '健康证已过期,请尽快更新';
  }
  return '';
});

async function refreshProfile(): Promise<void> {
  const [p, s] = await Promise.all([getProfile(), getOnboardingStatus()]);
  if (p.code === '0' && p.data) {
    profile.value = p.data;
    onlineStatus.value = p.data.onlineStatus ?? 'offline';
    if (onlineStatus.value === 'online') startHeartbeat();
  }
  if (s.code === '0' && s.data) {
    approved.value = s.data.auditStatus === 'approved';
    auditStatusRaw.value = s.data.auditStatus ?? null;
  }

  // 今日收益 + 考核 + 当前任务
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [e, a, t] = await Promise.all([
    getEarnings({ fromDate: startOfDay.getTime(), toDate: Date.now(), pageNo: 1, pageSize: 50 }),
    getAssessment(),
    getMyCurrentTask(),
  ]);
  if (e.code === '0' && e.data) todayEarnings.value = e.data;
  if (a.code === '0' && a.data) assessment.value = a.data;
  if (t.code === '0') currentTask.value = t.data ?? null;
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
      onlineStatus.value = (r.data.riderStatus as 'online' | 'offline' | 'busy') ?? 'offline';
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
onShow(() => {
  uni.hideTabBar({ animation: false });
  void refreshProfile();
});

function go(url: string, isTab = false): void {
  if (isTab) uni.switchTab({ url });
  else uni.navigateTo({ url });
}

const todayString = computed<string>(() => {
  const d = new Date();
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 · 周${['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}`;
});

const realNameDisplay = computed<string>(() => profile.value?.realName ?? '未审核');
const avatarLetter = computed<string>(() => {
  const n = profile.value?.realName ?? '';
  return n ? n.slice(0, 1) : '骑';
});

const onlineLabel = computed<string>(() => {
  if (onlineStatus.value === 'online') return '在线接单';
  if (onlineStatus.value === 'busy') return '配送中';
  return '已下线';
});

const todayIncomeYuan = computed<string>(() => todayEarnings.value?.totalIncome ?? '0.00');
const todayOrderCount = computed<number>(() => todayEarnings.value?.orderCount ?? 0);

const onTimeRate = computed<string>(() => {
  const r = assessment.value?.onTimeRate;
  if (!r) return '—';
  const pct = Number(r) * 100;
  if (!Number.isFinite(pct)) return r;
  return `${pct.toFixed(1)}%`;
});

function fmtETA(ms: number | null): string {
  if (!ms) return '';
  const left = Math.max(0, Math.floor((ms - Date.now()) / 60000));
  if (left === 0) return '已超时';
  return `预计 ${left} 分钟内送达`;
}
</script>

<template>
  <view class="wb">
    <!-- Hero -->
    <view class="wb__hero">
      <view class="wb__hero-deco wb__hero-deco--1" />
      <view class="wb__hero-deco wb__hero-deco--2" />

      <view class="wb__hero-top">
        <view class="wb__hero-row">
          <view class="wb__avatar">
            <text class="wb__avatar-letter">{{ avatarLetter }}</text>
            <view class="wb__avatar-dot" :class="`wb__avatar-dot--${onlineStatus}`" />
          </view>
          <view class="wb__hero-main">
            <text class="wb__hero-date">{{ todayString }}</text>
            <text class="wb__hero-name">{{ realNameDisplay }}</text>
            <view class="wb__hero-credit">
              <SvgIcon name="star" :size="14" color="#fff" />
              <text>{{ profile?.creditScore ?? 100 }} 信用分</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 大上线开关 -->
      <view
        class="wb__switch"
        :class="{
          'wb__switch--online': onlineStatus === 'online',
          'wb__switch--busy': onlineStatus === 'busy',
          'wb__switch--disabled': loading || (onlineStatus === 'offline' && !canGoOnline),
        }"
        @tap="toggleOnline"
      >
        <view class="wb__switch-pulse" v-if="onlineStatus === 'online'" />
        <view class="wb__switch-icon">
          <SvgIcon :name="onlineStatus === 'online' ? 'zap' : 'motorcycle'" :size="32" color="#fff" />
        </view>
        <view class="wb__switch-main">
          <text class="wb__switch-label">{{ loading ? '处理中…' : onlineLabel }}</text>
          <text class="wb__switch-sub" v-if="onlineStatus === 'online'">收到派单将通知您</text>
          <text class="wb__switch-sub" v-else-if="onlineStatus === 'busy'">完成当前任务后可继续接单</text>
          <text class="wb__switch-sub" v-else>{{ canGoOnline ? '点击上线开始接单' : '暂不可上线' }}</text>
        </view>
        <text class="wb__switch-arrow">›</text>
      </view>
      <view v-if="onlineStatus === 'offline' && reasonText" class="wb__hint">
        <SvgIcon name="alert-triangle" :size="16" color="#fef3c7" />
        <text>{{ reasonText }}</text>
      </view>
    </view>

    <!-- 当前任务 -->
    <view v-if="currentTask" class="wb__section">
      <view class="wb__section-head">
        <view class="wb__section-bar" />
        <text class="wb__section-title">当前任务</text>
        <text class="wb__section-tip" @tap="go('/pages/tasks/current', true)">前往处理 ›</text>
      </view>
      <view class="wb__task" @tap="go('/pages/tasks/current', true)">
        <view class="wb__task-row">
          <view class="wb__task-biz" :class="`wb__task-biz--${currentTask.bizType}`">
            {{ currentTask.bizType === 'FOOD' ? '外卖' : '跑腿' }}
          </view>
          <text class="wb__task-status">{{ labelRiderTaskStatus(currentTask.status) }}</text>
        </view>
        <view v-if="currentTask.pickupLocation" class="wb__task-loc">
          <view class="wb__task-loc-dot wb__task-loc-dot--pickup" />
          <text class="wb__task-loc-text">{{ currentTask.pickupLocation.name }}</text>
        </view>
        <view v-if="currentTask.deliveryLocation" class="wb__task-loc">
          <view class="wb__task-loc-dot wb__task-loc-dot--delivery" />
          <text class="wb__task-loc-text">{{ currentTask.deliveryLocation.name }}</text>
        </view>
        <text v-if="currentTask.etaAt" class="wb__task-eta">{{ fmtETA(currentTask.etaAt) }}</text>
      </view>
    </view>

    <!-- 今日数据 -->
    <view class="wb__section">
      <view class="wb__section-head">
        <view class="wb__section-bar" />
        <text class="wb__section-title">今日数据</text>
        <text class="wb__section-tip" @tap="go('/pages/earnings/index', true)">收益详情 ›</text>
      </view>
      <view class="wb__stats">
        <view class="wb__stat">
          <text class="wb__stat-val">{{ todayOrderCount }}</text>
          <text class="wb__stat-label">完成订单</text>
        </view>
        <view class="wb__stat-divider" />
        <view class="wb__stat">
          <text class="wb__stat-val">¥{{ todayIncomeYuan }}</text>
          <text class="wb__stat-label">今日收益</text>
        </view>
        <view class="wb__stat-divider" />
        <view class="wb__stat">
          <text class="wb__stat-val">{{ onTimeRate }}</text>
          <text class="wb__stat-label">准时率</text>
        </view>
      </view>
    </view>

    <!-- 快捷入口(精简版,避免和 tabBar/me 页重复) -->
    <view class="wb__section">
      <view class="wb__section-head">
        <view class="wb__section-bar" />
        <text class="wb__section-title">快捷入口</text>
      </view>
      <view class="wb__quicks">
        <view class="wb__quick" @tap="go('/pages/withdrawals/form')">
          <view class="wb__quick-icon"><SvgIcon name="credit-card" :size="26" color="#2e9c5d" /></view>
          <text class="wb__quick-label">申请提现</text>
        </view>
        <view class="wb__quick" @tap="go('/pages/assessment/index')">
          <view class="wb__quick-icon"><SvgIcon name="chart-bar" :size="26" color="#2e9c5d" /></view>
          <text class="wb__quick-label">考核中心</text>
        </view>
        <view class="wb__quick" @tap="go('/pages/violations/index')">
          <view class="wb__quick-icon"><SvgIcon name="alert-triangle" :size="26" color="#2e9c5d" /></view>
          <text class="wb__quick-label">违规记录</text>
        </view>
        <view class="wb__quick" @tap="go('/pages/onboarding/progress')">
          <view class="wb__quick-icon"><SvgIcon name="file-edit" :size="26" color="#2e9c5d" /></view>
          <text class="wb__quick-label">入驻进度</text>
        </view>
      </view>
    </view>

    <view class="wb__foot">
      <text class="wb__foot-text">O2O 骑手端 · 安全骑行,文明配送</text>
    </view>
    <FloatTabBar active="workbench" />
  </view>
</template>

<style scoped>
.wb {
  min-height: 100vh;
  padding: 0 0 200rpx;
  background: #f5f6f8;
}

/* Hero */
.wb__hero {
  position: relative;
  overflow: hidden;
  padding: 36rpx 28rpx 28rpx;
  background: var(--brand-gradient-reverse);
  color: #fff;
}
.wb__hero-deco {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  pointer-events: none;
}
.wb__hero-deco--1 {
  width: 280rpx;
  height: 280rpx;
  right: -100rpx;
  top: -100rpx;
}
.wb__hero-deco--2 {
  width: 180rpx;
  height: 180rpx;
  left: -60rpx;
  bottom: -80rpx;
}
.wb__hero-top {
  position: relative;
}
.wb__hero-row {
  display: flex;
  align-items: center;
  gap: 18rpx;
}
.wb__avatar {
  position: relative;
  width: 96rpx;
  height: 96rpx;
  border-radius: 48rpx;
  background: rgba(255, 255, 255, 0.18);
  border: 2rpx solid rgba(255, 255, 255, 0.24);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.wb__avatar-letter {
  font-size: 42rpx;
  font-weight: 800;
  color: #fff;
}
.wb__avatar-dot {
  position: absolute;
  right: 2rpx;
  bottom: 2rpx;
  width: 22rpx;
  height: 22rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.45);
  border: 4rpx solid #5fbe7d;
}
.wb__avatar-dot--online {
  background: #4ade80;
  box-shadow: 0 0 0 4rpx rgba(74, 222, 128, 0.32);
}
.wb__avatar-dot--busy {
  background: #f59e0b;
}
.wb__hero-main {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.wb__hero-date {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.78);
  letter-spacing: 0.5rpx;
}
.wb__hero-name {
  font-size: 34rpx;
  font-weight: 800;
}
.wb__hero-credit {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 2rpx 10rpx;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 4rpx;
  font-size: 20rpx;
  font-weight: 600;
  align-self: flex-start;
}

/* 大上线开关 */
.wb__switch {
  position: relative;
  margin-top: 22rpx;
  padding: 22rpx 22rpx 22rpx 24rpx;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 14rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
  gap: 16rpx;
  overflow: hidden;
}
.wb__switch--online {
  background: rgba(74, 222, 128, 0.32);
  border-color: rgba(74, 222, 128, 0.6);
  box-shadow: 0 12rpx 30rpx rgba(74, 222, 128, 0.36);
}
.wb__switch--busy {
  background: rgba(245, 158, 11, 0.32);
  border-color: rgba(245, 158, 11, 0.6);
}
.wb__switch--disabled {
  opacity: 0.6;
}
.wb__switch-pulse {
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200rpx;
  height: 200rpx;
  background: radial-gradient(circle, rgba(74, 222, 128, 0.4), transparent 70%);
  pointer-events: none;
}
.wb__switch-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}
.wb__switch-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  position: relative;
}
.wb__switch-label {
  font-size: 30rpx;
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.5rpx;
}
.wb__switch-sub {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.82);
}
.wb__switch-arrow {
  font-size: 40rpx;
  color: rgba(255, 255, 255, 0.7);
  position: relative;
}

.wb__hint {
  margin-top: 14rpx;
  padding: 10rpx 14rpx;
  background: rgba(255, 77, 79, 0.18);
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 22rpx;
  color: #fee2e2;
  position: relative;
}

/* Section */
.wb__section {
  margin: 16rpx 24rpx 0;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
  padding: 22rpx 22rpx 22rpx;
}
.wb__section-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding-bottom: 14rpx;
}
.wb__section-bar {
  width: 6rpx;
  height: 24rpx;
  background: var(--brand-primary);
  border-radius: 2rpx;
}
.wb__section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-primary);
}
.wb__section-tip {
  font-size: 22rpx;
  color: var(--brand-primary);
  font-weight: 600;
  margin-left: auto;
}

/* 当前任务卡 */
.wb__task {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.wb__task-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.wb__task-biz {
  padding: 4rpx 12rpx;
  font-size: 20rpx;
  font-weight: 700;
  border-radius: 4rpx;
}
.wb__task-biz--FOOD {
  background: #fff1e6;
  color: var(--price-color);
}
.wb__task-biz--ERRAND {
  background: rgba(46, 156, 93, 0.1);
  color: var(--brand-primary);
}
.wb__task-status {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--brand-primary);
}
.wb__task-loc {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  padding: 4rpx 0;
}
.wb__task-loc-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  margin-top: 8rpx;
  flex-shrink: 0;
}
.wb__task-loc-dot--pickup {
  background: #f7971e;
}
.wb__task-loc-dot--delivery {
  background: var(--brand-primary);
}
.wb__task-loc-text {
  flex: 1;
  font-size: 24rpx;
  color: var(--text-primary);
  line-height: 1.5;
}
.wb__task-eta {
  font-size: 22rpx;
  color: var(--price-color);
  font-weight: 600;
  background: rgba(192, 57, 43, 0.06);
  padding: 6rpx 12rpx;
  border-radius: 4rpx;
  align-self: flex-start;
}

/* 今日数据 */
.wb__stats {
  display: flex;
  align-items: stretch;
}
.wb__stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.wb__stat-val {
  font-size: 36rpx;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
  font-feature-settings: 'tnum';
  letter-spacing: -0.5rpx;
}
.wb__stat-label {
  font-size: 22rpx;
  color: var(--text-muted);
}
.wb__stat-divider {
  width: 1rpx;
  background: #e6e9ee;
  margin: 8rpx 0;
}

/* 快捷入口 */
.wb__quicks {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
}
.wb__quick {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 0;
}
.wb__quick-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;
  background: rgba(46, 156, 93, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.wb__quick-label {
  font-size: 22rpx;
  color: var(--text-secondary);
  font-weight: 500;
}

/* foot */
.wb__foot {
  margin: 24rpx 24rpx 0;
  padding: 16rpx 0;
  text-align: center;
}
.wb__foot-text {
  font-size: 20rpx;
  color: #b6bfcd;
}
</style>
