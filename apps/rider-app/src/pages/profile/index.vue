<script setup lang="ts">
/**
 * 骑手"我的"中心
 *  - Hero:头像 + 姓名 + 在线/信用分(真实数据)
 *  - 经营快览:今日订单 / 今日收益 / 准时率(真实数据)
 *  - 资质信息:手机 / 姓名 / 状态 / 健康证 / 审核
 *  - 车辆信息:可编辑(类型 / 车牌 / 品牌)
 *  - 财务 / 履约 / 应用 三组功能
 *  - 退出登录
 */
import { onShow } from '@dcloudio/uni-app';
import { computed, onMounted, ref } from 'vue';

import { getOnboardingStatus, getProfile, updateProfile, type RiderProfileVo, type VehicleType } from '@/api';
import { getAssessment, type AssessmentVo } from '@/api/rider-assessment';
import { getEarnings, type EarningSummaryVo } from '@/api/rider-earnings';
import FloatTabBar from '@/components/common/FloatTabBar.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const profile = ref<RiderProfileVo | null>(null);
const approved = ref(false);
const auditStatusLabel = ref<string>('');
const earnings = ref<EarningSummaryVo | null>(null);
const assessment = ref<AssessmentVo | null>(null);

const editing = ref(false);
const vehicleType = ref<VehicleType>('electric_bike');
const plateNo = ref('');
const brand = ref('');
const saving = ref(false);

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  electric_bike: '电动车',
  motorcycle: '摩托车',
  car: '汽车',
};

const VEHICLE_OPTIONS: Array<{ key: VehicleType; label: string; icon: string }> = [
  { key: 'electric_bike', label: '电动车', icon: 'bike' },
  { key: 'motorcycle', label: '摩托车', icon: 'motorcycle' },
  { key: 'car', label: '汽车', icon: 'truck' },
];

const AUDIT_LABEL: Record<string, string> = {
  approved: '已通过',
  pending: '审核中',
  rejected: '已驳回',
  disabled: '已禁用',
};

const ACCOUNT_LABEL: Record<string, string> = {
  active: '账号正常',
  pending: '审核中',
  disabled: '账号停用',
};

async function load(): Promise<void> {
  const [p, s] = await Promise.all([getProfile(), getOnboardingStatus()]);
  if (p.code === '0' && p.data) {
    profile.value = p.data;
    if (p.data.vehicle) {
      vehicleType.value = (p.data.vehicle.vehicleType as VehicleType) ?? 'electric_bike';
      plateNo.value = p.data.vehicle.plateNo ?? '';
      brand.value = p.data.vehicle.brand ?? '';
    }
  }
  if (s.code === '0' && s.data) {
    approved.value = s.data.auditStatus === 'approved';
    auditStatusLabel.value = AUDIT_LABEL[s.data.auditStatus ?? ''] ?? '';
  }
  // 今日数据
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [e, a] = await Promise.all([
    getEarnings({ fromDate: startOfDay.getTime(), toDate: Date.now(), pageNo: 1, pageSize: 50 }),
    getAssessment(),
  ]);
  if (e.code === '0' && e.data) earnings.value = e.data;
  if (a.code === '0' && a.data) assessment.value = a.data;
}

onMounted(load);
onShow(() => uni.hideTabBar({ animation: false }));

const realNameDisplay = computed<string>(() => profile.value?.realName ?? '未审核');
const avatarLetter = computed<string>(() => {
  const n = profile.value?.realName ?? '';
  return n ? n.slice(0, 1) : '骑';
});

const isOnline = computed<boolean>(() => profile.value?.onlineStatus === 'online');
const onlineStatusLabel = computed<string>(() => {
  const s = profile.value?.onlineStatus;
  if (s === 'online') return '在线';
  if (s === 'busy') return '忙碌';
  return '离线';
});

const healthCertExpiryStr = computed<string>(() => {
  const ms = profile.value?.healthCertExpiry;
  if (!ms) return '—';
  return new Date(Number(ms)).toLocaleDateString();
});

const healthCertExpired = computed<boolean>(() => {
  const ms = profile.value?.healthCertExpiry;
  if (!ms) return false;
  return Number(ms) < Date.now();
});

const approvedAtStr = computed<string>(() => {
  const ms = profile.value?.approvedAt;
  if (!ms) return '—';
  return new Date(Number(ms)).toLocaleDateString();
});

const todayIncomeYuan = computed<string>(() => earnings.value?.totalIncome ?? '0.00');
const todayOrderCount = computed<number>(() => earnings.value?.orderCount ?? 0);

const onTimeRate = computed<string>(() => {
  const r = assessment.value?.onTimeRate;
  if (!r) return '—';
  // 后端返回字符串(小数 0~1)
  const pct = Number(r) * 100;
  if (!Number.isFinite(pct)) return r;
  return `${pct.toFixed(1)}%`;
});

const ratingValue = computed<number>(() => Number(assessment.value?.avgRating ?? 0));
const ratingStars = computed<Array<'full' | 'half' | 'empty'>>(() => {
  const v = ratingValue.value;
  return [1, 2, 3, 4, 5].map((i) => (v >= i - 0.25 ? 'full' : v >= i - 0.75 ? 'half' : 'empty'));
});

async function save(): Promise<void> {
  saving.value = true;
  try {
    const r = await updateProfile({
      vehicle: { vehicleType: vehicleType.value, plateNo: plateNo.value, brand: brand.value },
    });
    if (r.code !== '0') {
      uni.showToast({ icon: 'none', title: r.message || '保存失败' });
      return;
    }
    uni.showToast({ icon: 'success', title: '已保存' });
    editing.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

function go(url: string, isTab = false): void {
  if (isTab) uni.switchTab({ url });
  else uni.navigateTo({ url });
}

async function onLogout(): Promise<void> {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出当前账号吗?',
    success: async (res) => {
      if (!res.confirm) return;
      await auth.logout();
      uni.reLaunch({ url: '/pages/login/index' });
    },
  });
}

function showContactSupport(): void {
  uni.showModal({
    title: '联系客服',
    content: '骑手客服热线:400-000-0001\n工作时间 9:00-22:00',
    showCancel: false,
  });
}

function showAbout(): void {
  uni.showModal({
    title: '关于 O2O 骑手端',
    content: '版本 1.0.0\n© 2026 O2O 平台',
    showCancel: false,
  });
}
</script>

<template>
  <view class="me">
    <!-- Hero -->
    <view class="me__hero">
      <view class="me__hero-deco me__hero-deco--1" />
      <view class="me__hero-deco me__hero-deco--2" />
      <view class="me__hero-row">
        <view class="me__avatar">
          <text class="me__avatar-letter">{{ avatarLetter }}</text>
          <view class="me__avatar-dot" :class="`me__avatar-dot--${profile?.onlineStatus || 'offline'}`" />
        </view>
        <view class="me__hero-main">
          <text class="me__hero-name">{{ realNameDisplay }}</text>
          <view class="me__hero-tags">
            <view class="me__hero-tag" :class="`me__hero-tag--${profile?.onlineStatus || 'offline'}`">
              <view class="me__hero-tag-dot" />
              <text>{{ onlineStatusLabel }}</text>
            </view>
            <view class="me__hero-tag me__hero-tag--credit">
              <SvgIcon name="star" :size="16" color="rgba(255,255,255,0.96)" />
              <text>{{ profile?.creditScore ?? 100 }} 信用分</text>
            </view>
          </view>
          <text v-if="profile?.mobile" class="me__hero-mobile">{{ profile.mobile }}</text>
        </view>
      </view>
      <view v-if="healthCertExpired" class="me__hero-warn">
        <SvgIcon name="alert-triangle" :size="18" color="#ff4d4f" />
        <text>健康证已过期,请尽快更新以恢复接单</text>
      </view>
      <view v-else-if="!approved && auditStatusLabel" class="me__hero-warn me__hero-warn--info">
        <SvgIcon name="lightbulb" :size="18" color="#fef3c7" />
        <text>入驻状态:{{ auditStatusLabel }}</text>
      </view>
    </view>

    <!-- 经营快览 -->
    <view class="me__stats">
      <view class="me__stat">
        <text class="me__stat-val">{{ todayOrderCount }}</text>
        <text class="me__stat-label">今日订单</text>
      </view>
      <view class="me__stat-divider" />
      <view class="me__stat">
        <text class="me__stat-val">¥{{ todayIncomeYuan }}</text>
        <text class="me__stat-label">今日收益</text>
      </view>
      <view class="me__stat-divider" />
      <view class="me__stat">
        <text class="me__stat-val">{{ onTimeRate }}</text>
        <text class="me__stat-label">准时率</text>
      </view>
    </view>

    <!-- 资质信息 -->
    <view class="me__section">
      <view class="me__section-head">
        <view class="me__section-bar" />
        <text class="me__section-title">资质信息</text>
        <view class="me__rating" v-if="assessment">
          <SvgIcon
            v-for="(s, i) in ratingStars"
            :key="i"
            name="star"
            :size="14"
            :color="s === 'empty' ? '#dde2ea' : '#f7971e'"
          />
          <text class="me__rating-val">{{ ratingValue.toFixed(1) }}</text>
        </view>
      </view>
      <view class="me__info">
        <view class="me__info-row">
          <text class="me__info-label">骑手 ID</text>
          <text class="me__info-val">{{ profile?.riderId ?? '—' }}</text>
        </view>
        <view class="me__info-row">
          <text class="me__info-label">真实姓名</text>
          <text class="me__info-val">{{ realNameDisplay }}</text>
        </view>
        <view class="me__info-row">
          <text class="me__info-label">账号状态</text>
          <text
            class="me__info-val"
            :class="profile?.accountStatus === 'active' ? 'me__info-val--ok' : 'me__info-val--warn'"
            >{{ ACCOUNT_LABEL[profile?.accountStatus ?? ''] ?? profile?.accountStatus ?? '—' }}</text
          >
        </view>
        <view class="me__info-row">
          <text class="me__info-label">健康证到期</text>
          <text class="me__info-val" :class="healthCertExpired ? 'me__info-val--warn' : ''"
            >{{ healthCertExpiryStr }}{{ healthCertExpired ? ' (已过期)' : '' }}</text
          >
        </view>
        <view class="me__info-row">
          <text class="me__info-label">审核通过</text>
          <text class="me__info-val">{{ approvedAtStr }}</text>
        </view>
      </view>
    </view>

    <!-- 车辆信息 -->
    <view class="me__section">
      <view class="me__section-head">
        <view class="me__section-bar" />
        <text class="me__section-title">车辆信息</text>
        <text v-if="!editing" class="me__section-action" @tap="editing = true">编辑 ›</text>
        <text v-else class="me__section-action" @tap="editing = false">取消</text>
      </view>

      <view v-if="!editing" class="me__info">
        <view class="me__info-row">
          <text class="me__info-label">类型</text>
          <text class="me__info-val">{{ VEHICLE_TYPE_LABEL[profile?.vehicle?.vehicleType ?? ''] ?? '—' }}</text>
        </view>
        <view class="me__info-row">
          <text class="me__info-label">车牌号</text>
          <text class="me__info-val">{{ profile?.vehicle?.plateNo || '—' }}</text>
        </view>
        <view class="me__info-row">
          <text class="me__info-label">品牌</text>
          <text class="me__info-val">{{ profile?.vehicle?.brand || '—' }}</text>
        </view>
      </view>

      <view v-else class="me__edit">
        <view class="me__edit-label">车辆类型</view>
        <view class="me__edit-vehicle">
          <view
            v-for="v in VEHICLE_OPTIONS"
            :key="v.key"
            class="me__edit-vehicle-item"
            :class="{ 'me__edit-vehicle-item--active': vehicleType === v.key }"
            @tap="vehicleType = v.key"
          >
            <SvgIcon :name="v.icon" :size="26" :color="vehicleType === v.key ? '#0f766e' : '#8a94a6'" />
            <text>{{ v.label }}</text>
          </view>
        </view>

        <view class="me__edit-label">车牌号</view>
        <input class="me__edit-input" v-model="plateNo" placeholder="如:沪 A·12345" maxlength="20" />

        <view class="me__edit-label">品牌</view>
        <input class="me__edit-input" v-model="brand" placeholder="如:雅迪 / 爱玛" maxlength="50" />

        <view class="me__edit-btn" :class="{ 'me__edit-btn--disabled': saving }" @tap="save">
          {{ saving ? '保存中…' : '保存修改' }}
        </view>
      </view>
    </view>

    <!-- 财务管理 -->
    <view class="me__section">
      <view class="me__section-head">
        <view class="me__section-bar" />
        <text class="me__section-title">财务管理</text>
      </view>
      <view class="me__list">
        <view class="me__item" @tap="go('/pages/earnings/index', true)">
          <view class="me__item-icon"><SvgIcon name="wallet" :size="24" color="#0f766e" /></view>
          <view class="me__item-main">
            <text class="me__item-label">收益中心</text>
            <text class="me__item-desc">查看每日结算明细</text>
          </view>
          <text class="me__item-arrow">›</text>
        </view>
        <view class="me__item" @tap="go('/pages/withdrawals/form')">
          <view class="me__item-icon"><SvgIcon name="credit-card" :size="24" color="#0f766e" /></view>
          <view class="me__item-main">
            <text class="me__item-label">申请提现</text>
            <text class="me__item-desc">把收益转到银行卡</text>
          </view>
          <text class="me__item-arrow">›</text>
        </view>
        <view class="me__item" @tap="go('/pages/withdrawals/records')">
          <view class="me__item-icon"><SvgIcon name="clipboard" :size="24" color="#0f766e" /></view>
          <view class="me__item-main">
            <text class="me__item-label">提现记录</text>
            <text class="me__item-desc">历史提现单</text>
          </view>
          <text class="me__item-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 履约管理 -->
    <view class="me__section">
      <view class="me__section-head">
        <view class="me__section-bar" />
        <text class="me__section-title">履约管理</text>
      </view>
      <view class="me__list">
        <view class="me__item" @tap="go('/pages/assessment/index')">
          <view class="me__item-icon"><SvgIcon name="chart-bar" :size="24" color="#0f766e" /></view>
          <view class="me__item-main">
            <text class="me__item-label">考核中心</text>
            <text class="me__item-desc">准时率 / 接单率 / 投诉率</text>
          </view>
          <text class="me__item-arrow">›</text>
        </view>
        <view class="me__item" @tap="go('/pages/violations/index')">
          <view class="me__item-icon"><SvgIcon name="alert-triangle" :size="24" color="#0f766e" /></view>
          <view class="me__item-main">
            <text class="me__item-label">违规记录</text>
            <text class="me__item-desc">异常订单与申诉</text>
          </view>
          <text class="me__item-arrow">›</text>
        </view>
        <view class="me__item" @tap="go('/pages/onboarding/progress')">
          <view class="me__item-icon"><SvgIcon name="file-edit" :size="24" color="#0f766e" /></view>
          <view class="me__item-main">
            <text class="me__item-label">入驻进度</text>
            <text class="me__item-desc">资质与审核状态</text>
          </view>
          <text class="me__item-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 帮助与设置 -->
    <view class="me__section">
      <view class="me__section-head">
        <view class="me__section-bar" />
        <text class="me__section-title">帮助与设置</text>
      </view>
      <view class="me__list">
        <view class="me__item" @tap="showContactSupport">
          <view class="me__item-icon"><SvgIcon name="life-buoy" :size="24" color="#0f766e" /></view>
          <view class="me__item-main">
            <text class="me__item-label">联系客服</text>
            <text class="me__item-desc">骑手专线 400-000-0001</text>
          </view>
          <text class="me__item-arrow">›</text>
        </view>
        <view class="me__item" @tap="showAbout">
          <view class="me__item-icon"><SvgIcon name="lightbulb" :size="24" color="#0f766e" /></view>
          <view class="me__item-main">
            <text class="me__item-label">关于</text>
            <text class="me__item-desc">版本信息</text>
          </view>
          <text class="me__item-arrow">›</text>
        </view>
      </view>
    </view>

    <view class="me__logout" @tap="onLogout">
      <SvgIcon name="x" :size="22" color="#ff4d4f" />
      <text class="me__logout-text">退出登录</text>
    </view>

    <view class="me__foot">
      <text class="me__foot-text">O2O 骑手端 · 版本 1.0.0</text>
    </view>
    <FloatTabBar active="profile" />
  </view>
</template>

<style scoped>
.me {
  min-height: 100vh;
  padding: 0 0 200rpx;
  background: #f5f6f8;
}

/* Hero — 与工作台同款青绿渐变 */
.me__hero {
  position: relative;
  overflow: hidden;
  padding: 44rpx 28rpx 68rpx;
  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
  color: #fff;
}
.me__hero-deco {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  pointer-events: none;
}
.me__hero-deco--1 {
  width: 240rpx;
  height: 240rpx;
  right: -80rpx;
  top: -80rpx;
}
.me__hero-deco--2 {
  width: 160rpx;
  height: 160rpx;
  left: -50rpx;
  bottom: -60rpx;
}
.me__hero-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.me__avatar {
  position: relative;
  width: 112rpx;
  height: 112rpx;
  border-radius: 56rpx;
  background: rgba(255, 255, 255, 0.18);
  border: 2rpx solid rgba(255, 255, 255, 0.24);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.me__avatar-letter {
  font-size: 48rpx;
  font-weight: 800;
  color: #fff;
}
.me__avatar-dot {
  position: absolute;
  right: 4rpx;
  bottom: 4rpx;
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: #999;
  border: 4rpx solid #14b8a6;
}
.me__avatar-dot--online {
  background: #4ade80;
  box-shadow: 0 0 0 4rpx rgba(74, 222, 128, 0.32);
}
.me__avatar-dot--busy {
  background: #f59e0b;
}
.me__avatar-dot--offline {
  background: rgba(255, 255, 255, 0.45);
}
.me__hero-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  min-width: 0;
}
.me__hero-name {
  font-size: 38rpx;
  font-weight: 800;
  letter-spacing: -0.5rpx;
}
.me__hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}
.me__hero-tag {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 12rpx;
  font-size: 20rpx;
  font-weight: 600;
  border-radius: 6rpx;
  background: rgba(255, 255, 255, 0.2);
}
.me__hero-tag--online {
  background: rgba(74, 222, 128, 0.32);
}
.me__hero-tag--busy {
  background: rgba(245, 158, 11, 0.32);
}
.me__hero-tag--offline {
  background: rgba(255, 255, 255, 0.18);
}
.me__hero-tag-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: currentColor;
}
.me__hero-tag--credit {
  background: rgba(255, 255, 255, 0.22);
}
.me__hero-mobile {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.74);
  font-feature-settings: 'tnum';
  letter-spacing: 0.5rpx;
}
.me__hero-warn {
  position: relative;
  margin-top: 22rpx;
  padding: 12rpx 16rpx;
  background: rgba(255, 77, 79, 0.18);
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 22rpx;
  color: #fee2e2;
}
.me__hero-warn--info {
  background: rgba(254, 243, 199, 0.18);
  color: #fef3c7;
}

/* 经营快览 */
.me__stats {
  margin: -36rpx 24rpx 0;
  display: flex;
  align-items: stretch;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
  padding: 24rpx 16rpx;
  position: relative;
  z-index: 2;
  box-shadow: 0 12rpx 32rpx rgba(15, 118, 110, 0.08);
}
.me__stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.me__stat-val {
  font-size: 34rpx;
  font-weight: 800;
  color: #172033;
  line-height: 1;
  font-feature-settings: 'tnum';
  letter-spacing: -0.5rpx;
}
.me__stat-label {
  font-size: 22rpx;
  color: #8a94a6;
}
.me__stat-divider {
  width: 1rpx;
  background: #e6e9ee;
  margin: 8rpx 0;
}

/* Section */
.me__section {
  margin: 16rpx 24rpx 0;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
  padding: 22rpx 22rpx 4rpx;
}
.me__section-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding-bottom: 14rpx;
}
.me__section-bar {
  width: 6rpx;
  height: 24rpx;
  background: #0f766e;
  border-radius: 2rpx;
}
.me__section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
}
.me__section-action {
  margin-left: auto;
  font-size: 22rpx;
  color: #0f766e;
  font-weight: 600;
}
.me__rating {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.me__rating-val {
  font-size: 22rpx;
  color: #f7971e;
  font-weight: 700;
  margin-left: 4rpx;
}

/* 信息 row */
.me__info {
  padding-bottom: 14rpx;
}
.me__info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx 0;
  border-top: 1rpx solid #f0f1f3;
}
.me__info-row:first-child {
  border-top: none;
}
.me__info-label {
  font-size: 24rpx;
  color: #8a94a6;
}
.me__info-val {
  font-size: 26rpx;
  color: #172033;
  font-weight: 600;
  max-width: 60%;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-feature-settings: 'tnum';
}
.me__info-val--ok {
  color: #0f766e;
}
.me__info-val--warn {
  color: #ff4d4f;
}

/* 车辆编辑 */
.me__edit {
  padding-bottom: 18rpx;
}
.me__edit-label {
  font-size: 22rpx;
  color: #8a94a6;
  margin-top: 14rpx;
  margin-bottom: 8rpx;
}
.me__edit-vehicle {
  display: flex;
  gap: 8rpx;
}
.me__edit-vehicle-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 16rpx 0;
  border: 1rpx solid #e6e9ee;
  border-radius: 10rpx;
  background: #fff;
  font-size: 22rpx;
  color: #8a94a6;
}
.me__edit-vehicle-item--active {
  border-color: #0f766e;
  background: rgba(15, 118, 110, 0.06);
  color: #0f766e;
  font-weight: 700;
}
.me__edit-input {
  width: 100%;
  padding: 18rpx 20rpx;
  background: #f7f8fa;
  border-radius: 10rpx;
  font-size: 28rpx;
  color: #172033;
  box-sizing: border-box;
}
.me__edit-btn {
  margin-top: 22rpx;
  padding: 22rpx 0;
  text-align: center;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  border-radius: 12rpx;
  box-shadow: 0 10rpx 24rpx rgba(15, 118, 110, 0.32);
  letter-spacing: 2rpx;
}
.me__edit-btn--disabled {
  background: #dde2ea;
  color: #b6bfcd;
  box-shadow: none;
}

/* 列表项 */
.me__list {
  padding-bottom: 4rpx;
}
.me__item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 18rpx 0;
  border-top: 1rpx solid #f0f1f3;
}
.me__item:first-child {
  border-top: none;
}
.me__item:active {
  background: rgba(15, 118, 110, 0.02);
}
.me__item-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 10rpx;
  background: rgba(15, 118, 110, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.me__item-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}
.me__item-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #172033;
}
.me__item-desc {
  font-size: 20rpx;
  color: #8a94a6;
  line-height: 1.4;
}
.me__item-arrow {
  color: #c5c9d2;
  font-size: 36rpx;
  flex-shrink: 0;
}

/* 退出 */
.me__logout {
  margin: 16rpx 24rpx 0;
  padding: 22rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
}
.me__logout:active {
  background: #fafbfc;
}
.me__logout-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #ff4d4f;
}

/* 底部 */
.me__foot {
  margin: 24rpx 24rpx 0;
  padding: 16rpx 0;
  text-align: center;
}
.me__foot-text {
  font-size: 20rpx;
  color: #b6bfcd;
}
</style>
