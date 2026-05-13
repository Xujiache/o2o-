<script setup lang="ts">
/**
 * 等待客户补付页 — 称重结算后 action=NEEDS_DIFF_PAY 跳转至此
 *
 * 实现:
 *  - 显示"差价"金额(从路由 query.diff 取,单位分)
 *  - 每 5s 轮询 once-verify(由于后端没有"按 id 查订单"接口,
 *    我们通过定时尝试 finalize,后端会在 diffPayStatus != paid 时返回错误,
 *    用户支付完成后 finalize 成功并跳回核销页)
 *  - 也允许店员手动点"已收到补付,立即完成"按钮主动 finalize
 */
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';

import { finalizePickup } from '@/api/grocery';
import SvgIcon from '@/components/common/SvgIcon.vue';

const orderId = ref('');
const diffCents = ref(0);
const submitting = ref(false);
const polling = ref(true);
const lastTryAt = ref(0);
let pollTimer: ReturnType<typeof setInterval> | null = null;

const diffYuan = computed(() => (diffCents.value / 100).toFixed(2));

onLoad((opts) => {
  orderId.value = (opts?.orderId as string) ?? '';
  diffCents.value = Number((opts?.diff as string) ?? 0) || 0;
  if (!orderId.value) {
    uni.showToast({ title: '订单参数缺失', icon: 'none' });
    return;
  }
  startPolling();
});

onShow(() => uni.hideTabBar({ animation: false }));

onUnload(() => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
});

function startPolling(): void {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (polling.value && !submitting.value) void tryFinalize(true);
  }, 5000);
}

async function tryFinalize(silent: boolean): Promise<void> {
  if (!orderId.value || submitting.value) return;
  submitting.value = true;
  lastTryAt.value = Date.now();
  try {
    const r = await finalizePickup(orderId.value);
    if (r.code === '0' && r.data) {
      polling.value = false;
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      uni.showToast({ title: '已完成 · 可出货', icon: 'success' });
      setTimeout(() => uni.switchTab({ url: '/pages/grocery/verify' }), 800);
      return;
    }
    if (!silent) {
      // 业务错误(如未付款)— request 已 toast,这里不重复提示
    }
  } finally {
    submitting.value = false;
  }
}

function onManualConfirm(): void {
  void tryFinalize(false);
}

function onBack(): void {
  uni.switchTab({ url: '/pages/grocery/verify' });
}

function fmtLastTry(): string {
  if (!lastTryAt.value) return '尚未尝试';
  const sec = Math.floor((Date.now() - lastTryAt.value) / 1000);
  if (sec < 5) return '刚刚';
  return `${sec} 秒前`;
}
const lastTryLabel = computed(() => fmtLastTry());
</script>

<template>
  <view class="dw">
    <view class="dw__head">
      <text class="dw__title">等待客户补付</text>
      <text class="dw__sub">客户在 APP 完成补付后,系统会自动放行</text>
    </view>

    <view class="dw__card">
      <view class="dw__icon">
        <SvgIcon name="credit-card" :size="56" color="#fff" />
      </view>
      <text class="dw__label">客户需补付</text>
      <view class="dw__amount">
        <text class="dw__amount-sym">¥</text>
        <text class="dw__amount-num">{{ diffYuan }}</text>
      </view>
      <view class="dw__poll">
        <view class="dw__poll-dot" />
        <text>{{ polling ? '每 5 秒自动检测一次' : '已完成,正在跳转…' }}</text>
      </view>
      <text class="dw__poll-last">最近尝试:{{ lastTryLabel }}</text>
    </view>

    <view class="dw__tips">
      <view class="dw__tips-bar" />
      <view class="dw__tips-main">
        <text class="dw__tips-title">操作提示</text>
        <text class="dw__tips-row">· 请提醒客户在 APP 内"我的订单"完成补付</text>
        <text class="dw__tips-row">· 系统每 5 秒自动校验,无需手动操作</text>
        <text class="dw__tips-row">· 若客户已显示"已付款",可点下方按钮立即放行</text>
      </view>
    </view>

    <view class="dw__foot">
      <view class="dw__btn dw__btn--ghost" @tap="onBack">
        <text>返回核销</text>
      </view>
      <view class="dw__btn dw__btn--primary" :class="{ 'dw__btn--disabled': submitting }" @tap="onManualConfirm">
        <text>{{ submitting ? '校验中…' : '客户已付款 · 立即放行' }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.dw {
  min-height: 100vh;
  padding: 24rpx 24rpx 220rpx;
  background: #f5f6f8;
}
.dw__head {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding: 4rpx;
}
.dw__title {
  font-size: 36rpx;
  font-weight: 800;
  color: #172033;
}
.dw__sub {
  font-size: 22rpx;
  color: #8a94a6;
}

.dw__card {
  margin-top: 18rpx;
  padding: 40rpx 28rpx;
  background: linear-gradient(135deg, #c0392b 0%, #f7971e 100%);
  border-radius: 14rpx;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  box-shadow: 0 12rpx 36rpx rgba(192, 57, 43, 0.28);
}
.dw__icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
}
.dw__label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 1rpx;
}
.dw__amount {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}
.dw__amount-sym {
  font-size: 36rpx;
  font-weight: 700;
}
.dw__amount-num {
  font-size: 90rpx;
  font-weight: 800;
  font-feature-settings: 'tnum';
  letter-spacing: -2rpx;
  line-height: 1;
}
.dw__poll {
  margin-top: 6rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 999rpx;
  font-size: 22rpx;
}
.dw__poll-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #38ef7d;
}
.dw__poll-last {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.72);
}

.dw__tips {
  margin-top: 18rpx;
  padding: 22rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
  display: flex;
  gap: 12rpx;
}
.dw__tips-bar {
  width: 6rpx;
  background: #b7791f;
  border-radius: 2rpx;
}
.dw__tips-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.dw__tips-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #172033;
}
.dw__tips-row {
  font-size: 22rpx;
  color: #5a6275;
  line-height: 1.6;
}

.dw__foot {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
  background: #fff;
  border-top: 1rpx solid #e6e9ee;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  display: flex;
  gap: 12rpx;
}
.dw__btn {
  flex: 1;
  padding: 22rpx 0;
  border-radius: 10rpx;
  text-align: center;
  font-size: 26rpx;
  font-weight: 700;
}
.dw__btn--ghost {
  background: #fff;
  color: #5a6275;
  border: 1rpx solid #d8dde4;
}
.dw__btn--primary {
  background: #11865c;
  color: #fff;
}
.dw__btn--disabled {
  background: #dde2ea;
  color: #b6bfcd;
}
</style>
