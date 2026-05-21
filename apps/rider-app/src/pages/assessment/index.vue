<script setup lang="ts">
import { computed, onMounted } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import { useAssessmentStore } from '@/stores/assessment';

const store = useAssessmentStore();

onMounted(() => store.load());

function pct(rate: string | undefined | null): number {
  if (!rate) return 0;
  return Number(rate) * 100;
}

function pctFmt(rate: string | undefined | null, decimals = 1): string {
  if (!rate) return '—';
  const v = Number(rate) * 100;
  if (!Number.isFinite(v)) return '—';
  return `${v.toFixed(decimals)}%`;
}

const ratingValue = computed<number>(() => Number(store.data?.avgRating ?? 0));
const ratingStars = computed<Array<'full' | 'half' | 'empty'>>(() => {
  const v = ratingValue.value;
  return [1, 2, 3, 4, 5].map((i) => (v >= i - 0.25 ? 'full' : v >= i - 0.75 ? 'half' : 'empty'));
});

const periodLabel = computed<string>(() => {
  const p = store.data?.period;
  if (!p) return '本期';
  const s = String(p);
  if (s.length === 6) return `${s.slice(0, 4)} 年 ${s.slice(4, 6)} 月`;
  if (s.length === 4) return `${s} 年`;
  return s;
});

// 评估 — 三项都有及格线
interface MetricCfg {
  key: 'onTimeRate' | 'acceptRate' | 'complaintRate';
  label: string;
  desc: string;
  icon: string;
  targetText: string;
  /** true = 越高越好(达到 target 视为达标) */
  higher: boolean;
  /** 目标值 0~1 */
  target: number;
}
const METRICS: MetricCfg[] = [
  {
    key: 'onTimeRate',
    label: '准时率',
    desc: '准时送达占比',
    icon: 'clock',
    targetText: '≥ 95%',
    higher: true,
    target: 0.95,
  },
  {
    key: 'acceptRate',
    label: '接单率',
    desc: '派单后接受占比',
    icon: 'check-circle',
    targetText: '≥ 90%',
    higher: true,
    target: 0.9,
  },
  {
    key: 'complaintRate',
    label: '投诉率',
    desc: '用户投诉占比(越低越好)',
    icon: 'alert-triangle',
    targetText: '≤ 3%',
    higher: false,
    target: 0.03,
  },
];

function metricVal(key: MetricCfg['key']): string {
  return pctFmt(store.data?.[key] ?? null);
}
function metricPct(key: MetricCfg['key']): number {
  return Math.min(100, Math.max(0, pct(store.data?.[key] ?? null)));
}
function metricStatus(cfg: MetricCfg): 'good' | 'normal' | 'bad' {
  const v = Number(store.data?.[cfg.key] ?? 0);
  if (cfg.higher) {
    if (v >= cfg.target) return 'good';
    if (v >= cfg.target * 0.85) return 'normal';
    return 'bad';
  } else {
    if (v <= cfg.target) return 'good';
    if (v <= cfg.target * 2) return 'normal';
    return 'bad';
  }
}
</script>

<template>
  <view class="a">
    <!-- Hero:评分概览 -->
    <view class="a__hero">
      <view class="a__hero-deco a__hero-deco--1" />
      <view class="a__hero-deco a__hero-deco--2" />
      <view class="a__hero-period">
        <SvgIcon name="calendar" :size="18" color="rgba(255,255,255,0.86)" />
        <text>考核期 · {{ periodLabel }}</text>
      </view>
      <view class="a__hero-row">
        <view class="a__hero-main">
          <text class="a__hero-label">综合评分</text>
          <view class="a__hero-rating-row">
            <text class="a__hero-rating">{{ ratingValue.toFixed(2) }}</text>
            <text class="a__hero-rating-max">/ 5.00</text>
          </view>
          <view class="a__hero-stars">
            <SvgIcon
              v-for="(s, i) in ratingStars"
              :key="i"
              name="star"
              :size="20"
              :color="s === 'empty' ? 'rgba(255,255,255,0.32)' : '#fbbf24'"
            />
          </view>
        </view>
        <view v-if="store.data?.rankInCity" class="a__hero-rank">
          <text class="a__hero-rank-label">城市排名</text>
          <text class="a__hero-rank-val">No.{{ store.data.rankInCity }}</text>
        </view>
      </view>
    </view>

    <view v-if="store.loading && !store.data" class="a__msg">加载中…</view>

    <!-- 核心指标 -->
    <view v-else-if="store.data" class="a__section">
      <view class="a__section-head">
        <view class="a__section-bar" />
        <text class="a__section-title">核心指标</text>
        <text class="a__section-tip">达标即合格</text>
      </view>

      <view class="a__metrics">
        <view v-for="m in METRICS" :key="m.key" class="a__metric">
          <view class="a__metric-head">
            <view class="a__metric-icon" :class="`a__metric-icon--${metricStatus(m)}`">
              <SvgIcon
                :name="m.icon"
                :size="24"
                :color="metricStatus(m) === 'good' ? '#2e9c5d' : metricStatus(m) === 'bad' ? '#ef4444' : '#b7791f'"
              />
            </view>
            <view class="a__metric-main">
              <text class="a__metric-label">{{ m.label }}</text>
              <text class="a__metric-desc">{{ m.desc }}</text>
            </view>
            <view class="a__metric-val">
              <text class="a__metric-val-num" :class="`a__metric-val-num--${metricStatus(m)}`">{{
                metricVal(m.key)
              }}</text>
              <text class="a__metric-target">目标 {{ m.targetText }}</text>
            </view>
          </view>
          <view class="a__metric-bar">
            <view
              class="a__metric-bar-fill"
              :class="`a__metric-bar-fill--${metricStatus(m)}`"
              :style="`width: ${metricPct(m.key)}%;`"
            />
          </view>
        </view>
      </view>
    </view>

    <!-- 勋章 -->
    <view v-if="store.data?.badges && store.data.badges.length > 0" class="a__section">
      <view class="a__section-head">
        <view class="a__section-bar" />
        <text class="a__section-title">已获勋章</text>
        <text class="a__section-tip">{{ store.data.badges.length }} 枚</text>
      </view>
      <view class="a__badges">
        <view v-for="b in store.data.badges" :key="b.code" class="a__badge">
          <view class="a__badge-icon">
            <SvgIcon name="sparkles" :size="26" color="#fff" />
          </view>
          <text class="a__badge-label">{{ b.label }}</text>
          <text class="a__badge-time">{{ new Date(b.awardedAt).toLocaleDateString() }}</text>
        </view>
      </view>
    </view>

    <view v-else-if="store.data" class="a__section">
      <view class="a__section-head">
        <view class="a__section-bar" />
        <text class="a__section-title">已获勋章</text>
      </view>
      <view class="a__empty">
        <SvgIcon name="sparkles" :size="80" color="#dde2ea" />
        <text class="a__empty-text">暂无勋章,继续努力!</text>
      </view>
    </view>

    <!-- 提示 -->
    <view class="a__hint">
      <SvgIcon name="lightbulb" :size="20" color="#2e9c5d" />
      <text>考核周期为自然月,数据每日 00:30 更新。当月数据次日早上完整。</text>
    </view>
  </view>
</template>

<style scoped>
.a {
  min-height: 100vh;
  padding: 0 0 60rpx;
  background: #f5f6f8;
}

/* Hero */
.a__hero {
  position: relative;
  overflow: hidden;
  padding: 36rpx 28rpx 36rpx;
  background: var(--brand-gradient-reverse);
  color: #fff;
}
.a__hero-deco {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  pointer-events: none;
}
.a__hero-deco--1 {
  width: 240rpx;
  height: 240rpx;
  right: -80rpx;
  top: -80rpx;
}
.a__hero-deco--2 {
  width: 160rpx;
  height: 160rpx;
  left: -50rpx;
  bottom: -60rpx;
}
.a__hero-period {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 14rpx;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 6rpx;
  font-size: 22rpx;
}
.a__hero-row {
  margin-top: 18rpx;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16rpx;
  position: relative;
}
.a__hero-main {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.a__hero-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.78);
}
.a__hero-rating-row {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
}
.a__hero-rating {
  font-size: 76rpx;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -2rpx;
  font-feature-settings: 'tnum';
}
.a__hero-rating-max {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
}
.a__hero-stars {
  display: flex;
  gap: 4rpx;
}
.a__hero-rank {
  text-align: right;
  padding: 10rpx 16rpx;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 10rpx;
}
.a__hero-rank-label {
  display: block;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.78);
}
.a__hero-rank-val {
  display: block;
  margin-top: 4rpx;
  font-size: 28rpx;
  font-weight: 800;
  letter-spacing: -0.5rpx;
}

.a__msg {
  text-align: center;
  padding: 100rpx 0;
  color: var(--text-muted);
  font-size: 24rpx;
}

/* Section */
.a__section {
  margin: 16rpx 24rpx 0;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
  padding: 22rpx 22rpx 22rpx;
}
.a__section-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding-bottom: 14rpx;
}
.a__section-bar {
  width: 6rpx;
  height: 24rpx;
  background: var(--brand-primary);
  border-radius: 2rpx;
}
.a__section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-primary);
}
.a__section-tip {
  font-size: 22rpx;
  color: var(--text-muted);
  margin-left: auto;
}

/* 核心指标 */
.a__metrics {
  display: flex;
  flex-direction: column;
  gap: 22rpx;
}
.a__metric {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.a__metric-head {
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.a__metric-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.a__metric-icon--good {
  background: rgba(17, 134, 92, 0.1);
}
.a__metric-icon--normal {
  background: rgba(183, 121, 31, 0.1);
}
.a__metric-icon--bad {
  background: rgba(192, 57, 43, 0.1);
}
.a__metric-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}
.a__metric-label {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--text-primary);
}
.a__metric-desc {
  font-size: 20rpx;
  color: var(--text-muted);
}
.a__metric-val {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2rpx;
  flex-shrink: 0;
}
.a__metric-val-num {
  font-size: 30rpx;
  font-weight: 800;
  line-height: 1;
  font-feature-settings: 'tnum';
}
.a__metric-val-num--good {
  color: var(--brand-primary);
}
.a__metric-val-num--normal {
  color: #b7791f;
}
.a__metric-val-num--bad {
  color: var(--price-color);
}
.a__metric-target {
  font-size: 18rpx;
  color: #b6bfcd;
}

.a__metric-bar {
  height: 10rpx;
  background: #f0f1f3;
  border-radius: 999rpx;
  overflow: hidden;
}
.a__metric-bar-fill {
  height: 100%;
  border-radius: 999rpx;
  transition: width 0.4s;
}
.a__metric-bar-fill--good {
  background: linear-gradient(90deg, #2e9c5d, #5fbe7d);
}
.a__metric-bar-fill--normal {
  background: linear-gradient(90deg, #b7791f, #f59e0b);
}
.a__metric-bar-fill--bad {
  background: linear-gradient(90deg, #b91c1c, #ef4444);
}

/* 勋章 grid */
.a__badges {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14rpx;
}
.a__badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 18rpx 12rpx;
  background: linear-gradient(180deg, #fff7e0, #fff);
  border: 1rpx solid rgba(247, 151, 30, 0.32);
  border-radius: 12rpx;
}
.a__badge-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #f59e0b, #f7971e);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 18rpx rgba(247, 151, 30, 0.4);
}
.a__badge-label {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
}
.a__badge-time {
  font-size: 18rpx;
  color: var(--text-muted);
}

.a__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 40rpx 0 20rpx;
}
.a__empty-text {
  font-size: 22rpx;
  color: var(--text-muted);
}

/* 提示 */
.a__hint {
  margin: 16rpx 24rpx 0;
  padding: 16rpx 20rpx;
  background: rgba(46, 156, 93, 0.05);
  border: 1rpx dashed rgba(46, 156, 93, 0.24);
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  font-size: 20rpx;
  color: var(--text-secondary);
  line-height: 1.5;
}
</style>
