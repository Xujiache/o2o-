<script setup lang="ts">
/**
 * 商城订单 — 基于核销流水视图(按自提点/日期/结果筛选)
 *
 * 说明:商家端后端目前只暴露"核销流水"和"时段配置"两个能聚合订单的接口,
 * 这里以"核销流水"为主数据源,按"自提点 + 日期 + 结果"做过滤展示。
 * 若后续后端开放商家端订单列表 (/m/grocery/orders),只需替换数据源即可。
 */
import { onShow } from '@dcloudio/uni-app';
import { computed, onMounted, ref } from 'vue';

import { listPickupPoints, listVerifyLogs, type PickupPointVo, type VerifyLogVo } from '@/api/grocery';
import SvgIcon from '@/components/common/SvgIcon.vue';

const points = ref<PickupPointVo[]>([]);
const currentPoint = ref<string>(''); // '' = 全部
const date = ref<string>('');
const filter = ref<'all' | 'ok' | 'fail'>('all');
const list = ref<VerifyLogVo[]>([]);
const total = ref(0);
const loading = ref(false);

onMounted(() => {
  date.value = today();
  void loadPoints();
  void load();
});

onShow(() => uni.hideTabBar({ animation: false }));

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

async function loadPoints(): Promise<void> {
  const r = await listPickupPoints();
  if (r.code === '0' && r.data) points.value = r.data;
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await listVerifyLogs({
      pickupPointId: currentPoint.value || undefined,
      fromDate: date.value,
      toDate: date.value,
      result: filter.value === 'all' ? undefined : filter.value === 'ok' ? '1' : '0',
      pageNo: 1,
      pageSize: 100,
    });
    if (r.code === '0' && r.data) {
      list.value = r.data.items;
      total.value = r.data.total;
    }
  } finally {
    loading.value = false;
  }
}

const pointTabs = computed(() => [
  { pickupPointId: '', name: '全部自提点' } as Partial<PickupPointVo> & { pickupPointId: string; name: string },
  ...points.value,
]);

function pointName(id: string): string {
  return points.value.find((p) => p.pickupPointId === id)?.name ?? '—';
}

// 按时段(小时)分组
interface HourBucket {
  hour: number;
  label: string;
  items: VerifyLogVo[];
}
const buckets = computed<HourBucket[]>(() => {
  const m: Record<number, VerifyLogVo[]> = {};
  for (const log of list.value) {
    const h = new Date(log.createdAt).getHours();
    const arr = m[h] ?? [];
    arr.push(log);
    m[h] = arr;
  }
  return Object.keys(m)
    .map((k) => Number(k))
    .sort((a, b) => a - b)
    .map((h) => ({
      hour: h,
      label: `${String(h).padStart(2, '0')}:00 - ${String(h + 1).padStart(2, '0')}:00`,
      items: m[h] ?? [],
    }));
});

function onPointTap(id: string): void {
  currentPoint.value = id;
  void load();
}

function onDateChange(e: { detail: { value: string } }): void {
  date.value = e.detail.value;
  void load();
}

function onFilter(f: 'all' | 'ok' | 'fail'): void {
  filter.value = f;
  void load();
}
</script>

<template>
  <view class="go">
    <view class="go__head">
      <text class="go__title">商城订单</text>
      <text class="go__sub">核销流水 · 共 {{ total }} 条</text>
    </view>

    <!-- 筛选条 -->
    <view class="go__filter">
      <picker mode="date" :value="date" @change="onDateChange">
        <view class="go__date">
          <SvgIcon name="calendar" :size="18" color="#5a6275" />
          <text>{{ date }}</text>
        </view>
      </picker>
      <view class="go__filter-tabs">
        <view
          v-for="t in [
            { k: 'all', label: '全部' },
            { k: 'ok', label: '成功' },
            { k: 'fail', label: '失败' },
          ]"
          :key="t.k"
          class="go__filter-tab"
          :class="{ 'go__filter-tab--active': filter === t.k }"
          @tap="onFilter(t.k as 'all' | 'ok' | 'fail')"
        >
          {{ t.label }}
        </view>
      </view>
    </view>

    <scroll-view class="go__points" scroll-x>
      <view class="go__points-row">
        <view
          v-for="p in pointTabs"
          :key="p.pickupPointId || 'all'"
          class="go__point"
          :class="{ 'go__point--active': currentPoint === p.pickupPointId }"
          @tap="onPointTap(p.pickupPointId)"
        >
          {{ p.name }}
        </view>
      </view>
    </scroll-view>

    <view v-if="loading && list.length === 0" class="go__msg">加载中…</view>
    <view v-else-if="list.length === 0" class="go__empty">
      <SvgIcon name="clipboard" :size="100" color="#dde2ea" />
      <text>当日暂无核销记录</text>
    </view>

    <view v-else class="go__buckets">
      <view v-for="b in buckets" :key="b.hour" class="go__bucket">
        <view class="go__bucket-head">
          <view class="go__bucket-bar" />
          <text class="go__bucket-label">{{ b.label }}</text>
          <text class="go__bucket-count">{{ b.items.length }} 单</text>
        </view>
        <view class="go__bucket-list">
          <view v-for="log in b.items" :key="log.verifyLogId" class="go__row">
            <view class="go__row-l">
              <text class="go__row-no">{{ log.orderNo }}</text>
              <text class="go__row-meta">
                {{ pointName(log.pickupPointId) }} · {{ log.verifyMethod === 1 ? '扫码' : '手输' }} ·
                {{ log.operatorName ?? '店员' }}
              </text>
              <text v-if="log.failReason" class="go__row-fail">失败原因:{{ log.failReason }}</text>
            </view>
            <view class="go__row-r">
              <text class="go__row-time">{{ fmtTime(log.createdAt) }}</text>
              <text class="go__row-tag" :class="log.result === 1 ? 'go__row-tag--ok' : 'go__row-tag--fail'">
                {{ log.result === 1 ? '成功' : '失败' }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.go {
  min-height: 100vh;
  padding: 24rpx 24rpx 200rpx;
  background: #f5f6f8;
}
.go__head {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  padding: 4rpx;
}
.go__title {
  font-size: 36rpx;
  font-weight: 800;
  color: #172033;
}
.go__sub {
  font-size: 22rpx;
  color: #8a94a6;
}

.go__filter {
  margin-top: 14rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.go__date {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 16rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 10rpx;
  font-size: 24rpx;
  color: #172033;
  font-feature-settings: 'tnum';
}
.go__filter-tabs {
  display: flex;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 10rpx;
  overflow: hidden;
  flex: 1;
}
.go__filter-tab {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  font-size: 22rpx;
  color: #5a6275;
}
.go__filter-tab--active {
  background: #b7791f;
  color: #fff;
  font-weight: 700;
}

.go__points {
  margin-top: 12rpx;
}
.go__points-row {
  display: inline-flex;
  gap: 10rpx;
  padding: 4rpx 0;
}
.go__point {
  padding: 10rpx 22rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #5a6275;
  white-space: nowrap;
}
.go__point--active {
  background: #b7791f;
  color: #fff;
  border-color: #b7791f;
  font-weight: 700;
}

.go__msg {
  text-align: center;
  padding: 100rpx 0;
  color: #8a94a6;
  font-size: 24rpx;
}
.go__empty {
  padding: 100rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  color: #8a94a6;
  font-size: 24rpx;
}

.go__buckets {
  margin-top: 14rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}
.go__bucket {
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 12rpx;
  overflow: hidden;
}
.go__bucket-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 22rpx;
  background: #fafbfc;
  border-bottom: 1rpx solid #f0f1f3;
}
.go__bucket-bar {
  width: 6rpx;
  height: 22rpx;
  background: #b7791f;
  border-radius: 2rpx;
}
.go__bucket-label {
  font-size: 26rpx;
  font-weight: 700;
  color: #172033;
  font-feature-settings: 'tnum';
}
.go__bucket-count {
  margin-left: auto;
  font-size: 22rpx;
  color: #8a94a6;
}
.go__bucket-list {
  padding: 4rpx 0;
}
.go__row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 22rpx;
  border-bottom: 1rpx solid #f0f1f3;
}
.go__row:last-child {
  border-bottom: none;
}
.go__row-l {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}
.go__row-no {
  font-size: 24rpx;
  color: #172033;
  font-feature-settings: 'tnum';
}
.go__row-meta {
  font-size: 20rpx;
  color: #8a94a6;
}
.go__row-fail {
  font-size: 20rpx;
  color: #c0392b;
}
.go__row-r {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.go__row-time {
  font-size: 22rpx;
  color: #5a6275;
  font-feature-settings: 'tnum';
}
.go__row-tag {
  padding: 4rpx 10rpx;
  border-radius: 4rpx;
  font-size: 18rpx;
  font-weight: 700;
}
.go__row-tag--ok {
  color: #11865c;
  background: #e9f7ef;
}
.go__row-tag--fail {
  color: #c0392b;
  background: #fdecea;
}
</style>
