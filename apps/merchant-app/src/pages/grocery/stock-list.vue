<script setup lang="ts">
/**
 * 今日备货 — 按时段聚合
 *
 * 数据源(后端无"商家订单列表"接口,以现有可用数据近似聚合):
 *  - listPickupPoints 拿所有自提点
 *  - 每个自提点的"今日时段"slots → 取 reserved 为该时段待提货单数
 *  - 同时拉今日核销流水,记录"已核销/已交付"数(已完成)
 *
 * 视图:
 *  - 顶部数字看板:今日待提货单数(sum reserved)/ 已核销数 / 待核销数(差值)
 *  - 列表:按时段(分钟段)展示每个时段的 capacity / reserved / 已核销 / 剩余待核销
 */
import { onShow } from '@dcloudio/uni-app';
import { computed, onMounted, ref } from 'vue';

import {
  listPickupPoints,
  listPickupSlots,
  listVerifyLogs,
  type PickupPointVo,
  type PickupSlotVo,
  type VerifyLogVo,
} from '@/api/grocery';
import SvgIcon from '@/components/common/SvgIcon.vue';

const points = ref<PickupPointVo[]>([]);
const todaySlots = ref<Record<string, PickupSlotVo[]>>({});
const verifyOk = ref<VerifyLogVo[]>([]);
const loading = ref(false);

const today = computed(() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
});

onMounted(() => {
  void loadAll();
});

onShow(() => uni.hideTabBar({ animation: false }));

async function loadAll(): Promise<void> {
  loading.value = true;
  try {
    const pr = await listPickupPoints();
    if (pr.code === '0' && pr.data) points.value = pr.data;
    // 拉每个自提点的今日时段(并行)
    const map: Record<string, PickupSlotVo[]> = {};
    await Promise.all(
      points.value.map(async (p) => {
        const r = await listPickupSlots(p.pickupPointId, today.value, today.value);
        if (r.code === '0' && r.data) map[p.pickupPointId] = r.data;
      }),
    );
    todaySlots.value = map;
    // 拉今日成功核销流水
    const vr = await listVerifyLogs({
      fromDate: today.value,
      toDate: today.value,
      result: '1',
      pageNo: 1,
      pageSize: 200,
    });
    if (vr.code === '0' && vr.data) verifyOk.value = vr.data.items;
  } finally {
    loading.value = false;
  }
}

function fmtTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const totalReserved = computed<number>(() => {
  let n = 0;
  for (const arr of Object.values(todaySlots.value)) {
    for (const s of arr) n += s.reserved;
  }
  return n;
});
const totalVerified = computed<number>(() => verifyOk.value.length);
const totalPending = computed<number>(() => Math.max(0, totalReserved.value - totalVerified.value));

// 按时段(全局)聚合
interface SlotRow {
  pickupPointId: string;
  pointName: string;
  startMinute: number;
  endMinute: number;
  capacity: number;
  reserved: number;
}

const rows = computed<SlotRow[]>(() => {
  const out: SlotRow[] = [];
  for (const p of points.value) {
    const arr = todaySlots.value[p.pickupPointId] ?? [];
    for (const s of arr) {
      out.push({
        pickupPointId: p.pickupPointId,
        pointName: p.name,
        startMinute: s.startMinute,
        endMinute: s.endMinute,
        capacity: s.capacity,
        reserved: s.reserved,
      });
    }
  }
  out.sort((a, b) => a.startMinute - b.startMinute);
  return out;
});

function gotoVerify(): void {
  uni.switchTab({ url: '/pages/grocery/verify' });
}
</script>

<template>
  <view class="sl">
    <view class="sl__head">
      <view class="sl__head-l">
        <text class="sl__title">今日备货</text>
        <text class="sl__sub">{{ today }} · 按时段聚合</text>
      </view>
      <view class="sl__head-r" @tap="loadAll">
        <SvgIcon name="refresh" :size="20" color="#5a6275" />
        <text>刷新</text>
      </view>
    </view>

    <!-- 看板 -->
    <view class="sl__board">
      <view class="sl__board-item">
        <text class="sl__board-num">{{ totalReserved }}</text>
        <text class="sl__board-label">今日预约</text>
      </view>
      <view class="sl__board-divider" />
      <view class="sl__board-item">
        <text class="sl__board-num sl__board-num--ok">{{ totalVerified }}</text>
        <text class="sl__board-label">已核销</text>
      </view>
      <view class="sl__board-divider" />
      <view class="sl__board-item">
        <text class="sl__board-num sl__board-num--warn">{{ totalPending }}</text>
        <text class="sl__board-label">待核销</text>
      </view>
    </view>

    <view v-if="loading && rows.length === 0" class="sl__msg">加载中…</view>
    <view v-else-if="rows.length === 0" class="sl__empty">
      <SvgIcon name="package" :size="100" color="#dde2ea" />
      <text>今日尚未配置时段,或暂无预约</text>
    </view>

    <view v-else class="sl__list">
      <view v-for="(r, idx) in rows" :key="`${r.pickupPointId}-${idx}`" class="sl__row">
        <view class="sl__row-l">
          <view class="sl__row-time">
            <SvgIcon name="clock" :size="16" color="#b7791f" />
            <text>{{ fmtTime(r.startMinute) }} ~ {{ fmtTime(r.endMinute) }}</text>
          </view>
          <text class="sl__row-point">{{ r.pointName }}</text>
        </view>
        <view class="sl__row-r">
          <view class="sl__row-bar">
            <view
              class="sl__row-bar-fill"
              :style="`width: ${Math.min(100, (r.reserved / Math.max(1, r.capacity)) * 100).toFixed(0)}%`"
            />
          </view>
          <text class="sl__row-cap">
            <text class="sl__row-cap-num">{{ r.reserved }}</text> / {{ r.capacity }}
          </text>
        </view>
      </view>
    </view>

    <view class="sl__tip">
      <SvgIcon name="alert-triangle" :size="18" color="#b7791f" />
      <text>本页统计基于"时段预约数 + 核销流水"近似聚合。完整 SKU 维度备货清单将于商家订单接口开放后补齐。</text>
    </view>

    <view class="sl__cta" @tap="gotoVerify">
      <SvgIcon name="radio-tower" :size="22" color="#fff" />
      <text>立即去核销</text>
    </view>
  </view>
</template>

<style scoped>
.sl {
  min-height: 100vh;
  padding: 24rpx 24rpx 220rpx;
  background: #f5f6f8;
}
.sl__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4rpx;
}
.sl__head-l {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.sl__title {
  font-size: 36rpx;
  font-weight: 800;
  color: #172033;
}
.sl__sub {
  font-size: 22rpx;
  color: #8a94a6;
}
.sl__head-r {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 14rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 8rpx;
  font-size: 22rpx;
  color: #5a6275;
}

.sl__board {
  margin-top: 16rpx;
  padding: 24rpx;
  background: linear-gradient(135deg, #1f2937 0%, #b7791f 100%);
  border-radius: 14rpx;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 0;
}
.sl__board-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.sl__board-num {
  font-size: 56rpx;
  font-weight: 800;
  line-height: 1;
  font-feature-settings: 'tnum';
}
.sl__board-num--ok {
  color: #38ef7d;
}
.sl__board-num--warn {
  color: #ffd5a3;
}
.sl__board-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
}
.sl__board-divider {
  width: 1rpx;
  height: 60rpx;
  background: rgba(255, 255, 255, 0.18);
}

.sl__msg {
  text-align: center;
  padding: 100rpx 0;
  color: #8a94a6;
  font-size: 24rpx;
}
.sl__empty {
  padding: 100rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  color: #8a94a6;
  font-size: 24rpx;
}

.sl__list {
  margin-top: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.sl__row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 18rpx 22rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 12rpx;
}
.sl__row-l {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 200rpx;
}
.sl__row-time {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: #172033;
  font-feature-settings: 'tnum';
}
.sl__row-point {
  font-size: 20rpx;
  color: #8a94a6;
}
.sl__row-r {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.sl__row-bar {
  flex: 1;
  height: 14rpx;
  background: #f0f1f3;
  border-radius: 999rpx;
  overflow: hidden;
}
.sl__row-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #b7791f, #f7971e);
  border-radius: 999rpx;
}
.sl__row-cap {
  font-size: 22rpx;
  color: #8a94a6;
  font-feature-settings: 'tnum';
  flex-shrink: 0;
}
.sl__row-cap-num {
  font-size: 28rpx;
  font-weight: 800;
  color: #b7791f;
}

.sl__tip {
  margin-top: 18rpx;
  padding: 14rpx 18rpx;
  background: #fff7e0;
  border: 1rpx solid #f0d68a;
  border-radius: 10rpx;
  display: flex;
  gap: 10rpx;
  align-items: flex-start;
  font-size: 20rpx;
  color: #8a6a1f;
  line-height: 1.5;
}

.sl__cta {
  position: fixed;
  left: 16rpx;
  right: 16rpx;
  bottom: 16rpx;
  z-index: 90;
  padding: 22rpx 0;
  background: #b7791f;
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  text-align: center;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  box-shadow: 0 12rpx 32rpx rgba(183, 121, 31, 0.36);
}
</style>
