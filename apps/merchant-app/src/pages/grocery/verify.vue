<script setup lang="ts">
/**
 * 商城核销 — 商家"商城" tab 主入口
 *
 * 流程:
 *  1) 扫码(uni.scanCode)或 手输 6 位提货码
 *  2) 调用 POST /m/pickup/verify
 *  3) 若 needsWeighing=true → 跳称重页 /pages/grocery/weigh
 *     否则 → 已完成核销,toast 提示并刷新流水
 */
import { onShow } from '@dcloudio/uni-app';
import { computed, onMounted, ref } from 'vue';

import { listPickupPoints, listVerifyLogs, type PickupPointVo, type VerifyLogVo, verifyPickup } from '@/api/grocery';
import FloatTabBar from '@/components/common/FloatTabBar.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';

const codeDigits = ref<string[]>(['', '', '', '', '', '']);
const submitting = ref(false);
const recentLogs = ref<VerifyLogVo[]>([]);
const pickupPoints = ref<PickupPointVo[]>([]);

const codeText = computed(() => codeDigits.value.join(''));
const canVerify = computed(() => /^\d{6}$/.test(codeText.value) && !submitting.value);

onMounted(() => {
  void loadPoints();
  void loadLogs();
});

onShow(() => uni.hideTabBar({ animation: false }));

async function loadPoints(): Promise<void> {
  const r = await listPickupPoints();
  if (r.code === '0' && r.data) pickupPoints.value = r.data;
}

async function loadLogs(): Promise<void> {
  const today = fmtDateInput(new Date());
  const r = await listVerifyLogs({ fromDate: today, toDate: today, pageNo: 1, pageSize: 20 });
  if (r.code === '0' && r.data) recentLogs.value = r.data.items;
}

function fmtDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function pointName(id: string): string {
  return pickupPoints.value.find((p) => p.pickupPointId === id)?.name ?? '—';
}

function onCodeInput(idx: number, e: Event): void {
  const raw = (e as unknown as { detail: { value: string } }).detail?.value ?? '';
  const val = raw.replace(/\D/g, '').slice(0, 1);
  codeDigits.value[idx] = val;
  // 自动跳焦下一格 — uni-app 简化处理:不自动 focus,用户依次点击即可
}

function onCodePaste(text: string): void {
  const digits = (text || '').replace(/\D/g, '').slice(0, 6);
  for (let i = 0; i < 6; i++) {
    codeDigits.value[i] = digits[i] ?? '';
  }
}

async function onScan(): Promise<void> {
  try {
    const res = await new Promise<UniApp.ScanCodeSuccessRes>((resolve, reject) => {
      uni.scanCode({
        scanType: ['qrCode', 'barCode'],
        success: resolve,
        fail: reject,
      });
    });
    const payload = res.result || '';
    if (!payload) {
      uni.showToast({ title: '扫码内容为空', icon: 'none' });
      return;
    }
    // PICKUP:<orderNo>:<code> 形式 — 直接 qrPayload 走;若是纯 6 位也支持
    if (/^\d{6}$/.test(payload)) {
      onCodePaste(payload);
      await submitVerify({ pickupCode: payload });
    } else {
      await submitVerify({ qrPayload: payload });
    }
  } catch (e) {
    const msg = (e as { errMsg?: string })?.errMsg ?? '';
    if (!/cancel/i.test(msg)) {
      uni.showToast({ title: '扫码失败,请使用手输', icon: 'none' });
    }
  }
}

async function onManualSubmit(): Promise<void> {
  if (!canVerify.value) return;
  await submitVerify({ pickupCode: codeText.value });
}

async function submitVerify(body: { pickupCode?: string; qrPayload?: string }): Promise<void> {
  if (submitting.value) return;
  submitting.value = true;
  try {
    const r = await verifyPickup(body);
    if (r.code !== '0' || !r.data) {
      // request 已 toast(可关闭 toastOnBizError)
      return;
    }
    const v = r.data;
    if (v.needsWeighing) {
      // 暂存订单快照供称重页读取(刷新会丢失但 setStorageSync 持久化更稳)
      try {
        uni.setStorageSync(`o2o:m:grocery:order:${v.groceryOrderId}`, JSON.stringify(v));
      } catch {
        // 容忍
      }
      uni.showToast({ title: '核销成功 · 进入称重', icon: 'success' });
      setTimeout(() => {
        uni.navigateTo({
          url: `/pages/grocery/weigh?orderId=${v.groceryOrderId}&orderNo=${encodeURIComponent(v.orderNo)}`,
        });
      }, 600);
    } else {
      uni.showToast({ title: '核销成功 · 已交付', icon: 'success' });
      // 清空输入并刷新流水
      onCodePaste('');
      await loadLogs();
    }
  } finally {
    submitting.value = false;
  }
}

function gotoOrders(): void {
  uni.navigateTo({ url: '/pages/grocery/orders' });
}
function gotoStock(): void {
  uni.navigateTo({ url: '/pages/grocery/stock-list' });
}
function gotoProducts(): void {
  uni.navigateTo({ url: '/pages/grocery/products' });
}
function gotoPoints(): void {
  uni.navigateTo({ url: '/pages/grocery/pickup-points' });
}
</script>

<template>
  <view class="vfy">
    <!-- 顶部 -->
    <view class="vfy__head">
      <view class="vfy__head-l">
        <text class="vfy__title">商城核销</text>
        <text class="vfy__sub">扫码 或 手输 6 位提货码</text>
      </view>
      <view class="vfy__head-r" @tap="loadLogs">
        <SvgIcon name="refresh" :size="20" color="#5a6275" />
        <text>刷新</text>
      </view>
    </view>

    <!-- 大按钮:扫码 -->
    <view class="vfy__scan" @tap="onScan">
      <view class="vfy__scan-icon">
        <SvgIcon name="radio-tower" :size="48" color="#fff" />
      </view>
      <view class="vfy__scan-main">
        <text class="vfy__scan-title">点击扫码核销</text>
        <text class="vfy__scan-sub">支持二维码 / 6 位条码</text>
      </view>
      <text class="vfy__scan-arrow">›</text>
    </view>

    <!-- 手输 6 位码 -->
    <view class="vfy__panel">
      <view class="vfy__panel-head">
        <view class="vfy__panel-bar" />
        <text class="vfy__panel-title">手输提货码</text>
      </view>
      <view class="vfy__code">
        <input
          v-for="i in 6"
          :key="i"
          class="vfy__code-cell"
          type="number"
          maxlength="1"
          :value="codeDigits[i - 1]"
          @input="onCodeInput(i - 1, $event)"
        />
      </view>
      <view class="vfy__btn" :class="{ 'vfy__btn--disabled': !canVerify }" @tap="onManualSubmit">
        <text>{{ submitting ? '核销中…' : '立即核销' }}</text>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="vfy__quicks">
      <view class="vfy__quick" @tap="gotoOrders">
        <SvgIcon name="clipboard" :size="28" color="#b7791f" />
        <text>商城订单</text>
      </view>
      <view class="vfy__quick" @tap="gotoStock">
        <SvgIcon name="package" :size="28" color="#b7791f" />
        <text>今日备货</text>
      </view>
      <view class="vfy__quick" @tap="gotoProducts">
        <SvgIcon name="shopping-bag" :size="28" color="#b7791f" />
        <text>生鲜商品</text>
      </view>
      <view class="vfy__quick" @tap="gotoPoints">
        <SvgIcon name="location-pin" :size="28" color="#b7791f" />
        <text>自提点</text>
      </view>
    </view>

    <!-- 今日核销流水 -->
    <view class="vfy__panel">
      <view class="vfy__panel-head">
        <view class="vfy__panel-bar" />
        <text class="vfy__panel-title">今日核销流水</text>
        <text class="vfy__panel-tip">{{ recentLogs.length }} 条</text>
      </view>
      <view v-if="recentLogs.length === 0" class="vfy__empty">
        <SvgIcon name="clipboard" :size="80" color="#dde2ea" />
        <text>今日尚未核销</text>
      </view>
      <view v-else class="vfy__logs">
        <view v-for="log in recentLogs" :key="log.verifyLogId" class="vfy__log">
          <view class="vfy__log-l">
            <text class="vfy__log-no">{{ log.orderNo }}</text>
            <text class="vfy__log-sub"
              >{{ pointName(log.pickupPointId) }} · {{ log.verifyMethod === 1 ? '扫码' : '手输' }}</text
            >
          </view>
          <view class="vfy__log-r">
            <text class="vfy__log-time">{{ fmtTime(log.createdAt) }}</text>
            <text class="vfy__log-tag" :class="log.result === 1 ? 'vfy__log-tag--ok' : 'vfy__log-tag--fail'">
              {{ log.result === 1 ? '成功' : '失败' }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <FloatTabBar active="grocery" />
  </view>
</template>

<style scoped>
.vfy {
  min-height: 100vh;
  padding: 24rpx 24rpx 200rpx;
  background: #f5f6f8;
}
.vfy__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4rpx;
}
.vfy__head-l {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.vfy__title {
  font-size: 36rpx;
  font-weight: 800;
  color: #172033;
}
.vfy__sub {
  font-size: 22rpx;
  color: #8a94a6;
}
.vfy__head-r {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 14rpx;
  border-radius: 8rpx;
  background: #fff;
  font-size: 22rpx;
  color: #5a6275;
  border: 1rpx solid #e6e9ee;
}

/* 扫码大按钮 */
.vfy__scan {
  margin-top: 18rpx;
  padding: 28rpx;
  background: linear-gradient(135deg, #b7791f 0%, #d99a3e 100%);
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
  box-shadow: 0 12rpx 32rpx rgba(183, 121, 31, 0.28);
}
.vfy__scan-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
}
.vfy__scan-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.vfy__scan-title {
  font-size: 32rpx;
  font-weight: 800;
  color: #fff;
}
.vfy__scan-sub {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
}
.vfy__scan-arrow {
  color: #fff;
  font-size: 48rpx;
}

/* 通用 panel */
.vfy__panel {
  margin-top: 18rpx;
  padding: 22rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
}
.vfy__panel-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 16rpx;
}
.vfy__panel-bar {
  width: 6rpx;
  height: 24rpx;
  background: #b7791f;
  border-radius: 2rpx;
}
.vfy__panel-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
}
.vfy__panel-tip {
  font-size: 22rpx;
  color: #8a94a6;
  margin-left: auto;
}

/* 6 位码格子 */
.vfy__code {
  display: flex;
  gap: 12rpx;
  margin-bottom: 18rpx;
}
.vfy__code-cell {
  flex: 1;
  height: 88rpx;
  background: #f7f8fa;
  border: 2rpx solid #e6e9ee;
  border-radius: 10rpx;
  text-align: center;
  font-size: 40rpx;
  font-weight: 800;
  color: #172033;
  font-feature-settings: 'tnum';
}
.vfy__btn {
  padding: 22rpx 0;
  background: #b7791f;
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: 10rpx;
  text-align: center;
}
.vfy__btn--disabled {
  background: #dde2ea;
  color: #b6bfcd;
}

/* 快捷入口 */
.vfy__quicks {
  margin-top: 18rpx;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
  padding: 18rpx 10rpx;
}
.vfy__quick {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 0;
  font-size: 22rpx;
  color: #5a6275;
}

/* 流水 */
.vfy__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0;
  gap: 10rpx;
  color: #8a94a6;
  font-size: 22rpx;
}
.vfy__logs {
  display: flex;
  flex-direction: column;
}
.vfy__log {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f0f1f3;
}
.vfy__log:last-child {
  border-bottom: none;
}
.vfy__log-l {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  flex: 1;
  min-width: 0;
}
.vfy__log-no {
  font-size: 24rpx;
  color: #172033;
  font-feature-settings: 'tnum';
}
.vfy__log-sub {
  font-size: 20rpx;
  color: #8a94a6;
}
.vfy__log-r {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.vfy__log-time {
  font-size: 22rpx;
  color: #5a6275;
  font-feature-settings: 'tnum';
}
.vfy__log-tag {
  padding: 4rpx 10rpx;
  border-radius: 4rpx;
  font-size: 20rpx;
  font-weight: 700;
}
.vfy__log-tag--ok {
  color: #11865c;
  background: #e9f7ef;
}
.vfy__log-tag--fail {
  color: #c0392b;
  background: #fdecea;
}
</style>
