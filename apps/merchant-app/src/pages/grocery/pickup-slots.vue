<script setup lang="ts">
/**
 * 自提点时段配置
 *  - 顶部 7 天日历预览 + 每日时段卡片(reserved/capacity)
 *  - 底部"批量配置"按钮:选 起始日 + 天数 + 多段(常用模板)
 *  - POST /m/pickup-points/:id/slots/batch
 */
import { onLoad, onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';

import { batchConfigPickupSlots, listPickupSlots, type PickupSlotVo } from '@/api/grocery';
import SvgIcon from '@/components/common/SvgIcon.vue';

const pointId = ref('');
const pointName = ref('');
const slots = ref<PickupSlotVo[]>([]);
const loading = ref(false);

// 范围:今天 ~ 今天+6
const fromDate = ref('');
const toDate = ref('');

onLoad((opts) => {
  pointId.value = (opts?.pointId as string) ?? '';
  pointName.value = (opts?.name as string) ?? '自提点';
  if (!pointId.value) {
    uni.showToast({ title: '缺少 pointId', icon: 'none' });
    return;
  }
  initRange();
  void load();
});

onShow(() => uni.hideTabBar({ animation: false }));

function initRange(): void {
  const now = new Date();
  fromDate.value = fmtDate(now);
  const end = new Date(now);
  end.setDate(end.getDate() + 6);
  toDate.value = fmtDate(end);
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function fmtTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await listPickupSlots(pointId.value, fromDate.value, toDate.value);
    if (r.code === '0' && r.data) slots.value = r.data;
  } finally {
    loading.value = false;
  }
}

const slotsByDate = computed<Record<string, PickupSlotVo[]>>(() => {
  const map: Record<string, PickupSlotVo[]> = {};
  for (const s of slots.value) {
    const arr = map[s.slotDate] ?? [];
    arr.push(s);
    map[s.slotDate] = arr;
  }
  for (const k of Object.keys(map)) {
    (map[k] ?? []).sort((a, b) => a.startMinute - b.startMinute);
  }
  return map;
});

const dateList = computed<string[]>(() => {
  const out: string[] = [];
  const start = new Date(fromDate.value);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push(fmtDate(d));
  }
  return out;
});

function weekDay(dateStr: string): string {
  const d = new Date(dateStr);
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return names[d.getDay()] ?? '';
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ============ 批量配置 ============
interface SlotInput {
  start: string; // HH:MM
  end: string;
  capacity: number;
}

const showBatch = ref(false);
const batchStartDate = ref('');
const batchDays = ref(7);
const batchSlots = ref<SlotInput[]>([
  { start: '08:00', end: '10:00', capacity: 20 },
  { start: '10:00', end: '12:00', capacity: 30 },
  { start: '14:00', end: '17:00', capacity: 30 },
  { start: '18:00', end: '20:00', capacity: 20 },
]);
const batchOverwrite = ref(false);
const submitting = ref(false);

function openBatch(): void {
  showBatch.value = true;
  batchStartDate.value = fromDate.value;
}
function closeBatch(): void {
  showBatch.value = false;
}

function addSlotRow(): void {
  if (batchSlots.value.length >= 12) {
    uni.showToast({ title: '每日最多 12 段', icon: 'none' });
    return;
  }
  batchSlots.value.push({ start: '12:00', end: '14:00', capacity: 20 });
}

function removeSlotRow(idx: number): void {
  if (batchSlots.value.length <= 1) return;
  batchSlots.value.splice(idx, 1);
}

function timeToMin(t: string): number {
  const parts = t.split(':').map((x) => Number(x) || 0);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 60 + m;
}

function inputValue(e: Event): string {
  return (e as unknown as { detail: { value: string } }).detail?.value ?? '';
}
function setSlotCapacity(s: SlotInput, e: Event): void {
  s.capacity = Math.max(1, Number(inputValue(e)) || 1);
}
function setOverwrite(e: Event): void {
  batchOverwrite.value = (e as unknown as { detail: { value: boolean } }).detail?.value ?? false;
}

async function submitBatch(): Promise<void> {
  if (submitting.value) return;
  // 校验
  for (const s of batchSlots.value) {
    const a = timeToMin(s.start);
    const b = timeToMin(s.end);
    if (b <= a) {
      uni.showToast({ title: '时段结束需大于开始', icon: 'none' });
      return;
    }
    if (s.capacity < 1) {
      uni.showToast({ title: '容量需 ≥ 1', icon: 'none' });
      return;
    }
  }
  submitting.value = true;
  try {
    const r = await batchConfigPickupSlots(pointId.value, {
      startDate: batchStartDate.value,
      days: batchDays.value,
      overwrite: batchOverwrite.value,
      slots: batchSlots.value.map((s) => ({
        startMinute: timeToMin(s.start),
        endMinute: timeToMin(s.end),
        capacity: s.capacity,
      })),
    });
    if (r.code === '0' && r.data) {
      uni.showToast({
        title: `新增 ${r.data.created} / 更新 ${r.data.updated} / 跳过 ${r.data.skipped}`,
        icon: 'none',
        duration: 2500,
      });
      closeBatch();
      await load();
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="ps">
    <view class="ps__head">
      <view class="ps__head-l">
        <text class="ps__title">时段配置</text>
        <text class="ps__sub">{{ pointName }}</text>
      </view>
      <view class="ps__head-r" @tap="openBatch">
        <SvgIcon name="plus" :size="20" color="#fff" />
        <text>批量配置</text>
      </view>
    </view>

    <view class="ps__range">
      <SvgIcon name="calendar" :size="20" color="#5a6275" />
      <text>{{ fromDate }} ~ {{ toDate }}</text>
      <view class="ps__refresh" @tap="load">刷新</view>
    </view>

    <view v-if="loading && slots.length === 0" class="ps__msg">加载中…</view>

    <view class="ps__days">
      <view v-for="d in dateList" :key="d" class="ps__day">
        <view class="ps__day-head">
          <text class="ps__day-date">{{ dayLabel(d) }}</text>
          <text class="ps__day-wday">{{ weekDay(d) }}</text>
          <text class="ps__day-count">{{ (slotsByDate[d] ?? []).length }} 段</text>
        </view>
        <view v-if="(slotsByDate[d] ?? []).length === 0" class="ps__day-empty">
          <text>未配置时段</text>
        </view>
        <view v-else class="ps__slots">
          <view v-for="s in slotsByDate[d]" :key="s.slotId" class="ps__slot">
            <view class="ps__slot-time">
              <SvgIcon name="clock" :size="16" color="#b7791f" />
              <text>{{ fmtTime(s.startMinute) }} ~ {{ fmtTime(s.endMinute) }}</text>
            </view>
            <view class="ps__slot-cap">
              <text class="ps__slot-cap-num">{{ s.reserved }}</text>
              <text class="ps__slot-cap-sep">/</text>
              <text class="ps__slot-cap-cap">{{ s.capacity }}</text>
            </view>
            <text class="ps__slot-tag" :class="s.remain === 0 ? 'ps__slot-tag--full' : 'ps__slot-tag--ok'">
              {{ s.remain === 0 ? '满' : `余 ${s.remain}` }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 批量配置弹层 -->
    <view v-if="showBatch" class="ps__modal">
      <view class="ps__modal-mask" @tap="closeBatch" />
      <view class="ps__modal-panel">
        <view class="ps__modal-head">
          <text class="ps__modal-title">批量配置时段</text>
          <SvgIcon name="x" :size="24" color="#8a94a6" @tap="closeBatch" />
        </view>

        <scroll-view class="ps__modal-body" scroll-y>
          <view class="ps__form-row">
            <text class="ps__form-label">起始日期</text>
            <picker mode="date" :value="batchStartDate" @change="batchStartDate = $event.detail.value">
              <view class="ps__picker">{{ batchStartDate || '请选择' }}</view>
            </picker>
          </view>
          <view class="ps__form-row">
            <text class="ps__form-label">应用天数</text>
            <view class="ps__days-pick">
              <view
                v-for="n in [1, 3, 7, 14, 21, 30]"
                :key="n"
                class="ps__day-pill"
                :class="{ 'ps__day-pill--active': batchDays === n }"
                @tap="batchDays = n"
              >
                {{ n }} 天
              </view>
            </view>
          </view>

          <view class="ps__sec">
            <view class="ps__sec-head">
              <text class="ps__sec-title">每日时段(1-12 段)</text>
              <text class="ps__sec-add" @tap="addSlotRow">+ 增加</text>
            </view>
            <view v-for="(s, idx) in batchSlots" :key="idx" class="ps__slot-row">
              <input class="ps__slot-input" v-model="s.start" placeholder="HH:MM" />
              <text class="ps__slot-dash">~</text>
              <input class="ps__slot-input" v-model="s.end" placeholder="HH:MM" />
              <input
                class="ps__slot-input ps__slot-input--cap"
                type="number"
                :value="s.capacity"
                placeholder="容量"
                @input="(e) => setSlotCapacity(s, e)"
              />
              <view class="ps__slot-del" @tap="removeSlotRow(idx)">
                <SvgIcon name="minus" :size="18" color="#c0392b" />
              </view>
            </view>
          </view>

          <view class="ps__form-row ps__form-row--inline">
            <text class="ps__form-label">已存在时段覆盖</text>
            <switch :checked="batchOverwrite" color="#b7791f" @change="setOverwrite" />
          </view>
        </scroll-view>

        <view class="ps__modal-foot">
          <view class="ps__modal-btn ps__modal-btn--ghost" @tap="closeBatch">取消</view>
          <view
            class="ps__modal-btn ps__modal-btn--primary"
            :class="{ 'ps__modal-btn--disabled': submitting }"
            @tap="submitBatch"
          >
            <text>{{ submitting ? '提交中…' : '保存' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.ps {
  min-height: 100vh;
  padding: 24rpx 24rpx 200rpx;
  background: #f5f6f8;
}
.ps__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4rpx;
}
.ps__head-l {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.ps__title {
  font-size: 36rpx;
  font-weight: 800;
  color: #172033;
}
.ps__sub {
  font-size: 22rpx;
  color: #8a94a6;
}
.ps__head-r {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 20rpx;
  background: #b7791f;
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
  border-radius: 8rpx;
}

.ps__range {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 16rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 10rpx;
  font-size: 22rpx;
  color: #5a6275;
}
.ps__refresh {
  margin-left: auto;
  font-size: 22rpx;
  color: #b7791f;
  font-weight: 700;
}

.ps__msg {
  text-align: center;
  padding: 60rpx 0;
  color: #8a94a6;
  font-size: 24rpx;
}

.ps__days {
  margin-top: 14rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.ps__day {
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 12rpx;
  overflow: hidden;
}
.ps__day-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 16rpx 22rpx;
  background: #fafbfc;
  border-bottom: 1rpx solid #f0f1f3;
}
.ps__day-date {
  font-size: 26rpx;
  font-weight: 800;
  color: #172033;
}
.ps__day-wday {
  font-size: 22rpx;
  color: #b7791f;
  font-weight: 700;
}
.ps__day-count {
  margin-left: auto;
  font-size: 22rpx;
  color: #8a94a6;
}
.ps__day-empty {
  padding: 22rpx;
  text-align: center;
  font-size: 22rpx;
  color: #b6bfcd;
}
.ps__slots {
  padding: 4rpx 0;
}
.ps__slot {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 14rpx 22rpx;
  border-bottom: 1rpx solid #f0f1f3;
}
.ps__slot:last-child {
  border-bottom: none;
}
.ps__slot-time {
  display: flex;
  align-items: center;
  gap: 6rpx;
  flex: 1;
  font-size: 24rpx;
  color: #172033;
  font-feature-settings: 'tnum';
}
.ps__slot-cap {
  display: flex;
  align-items: baseline;
  gap: 2rpx;
  font-size: 22rpx;
  color: #5a6275;
  font-feature-settings: 'tnum';
}
.ps__slot-cap-num {
  font-size: 26rpx;
  font-weight: 800;
  color: #b7791f;
}
.ps__slot-cap-sep {
  color: #b6bfcd;
}
.ps__slot-cap-cap {
  color: #8a94a6;
}
.ps__slot-tag {
  padding: 4rpx 10rpx;
  border-radius: 4rpx;
  font-size: 18rpx;
  font-weight: 700;
}
.ps__slot-tag--full {
  color: #c0392b;
  background: #fdecea;
}
.ps__slot-tag--ok {
  color: #11865c;
  background: #e9f7ef;
}

/* 弹层 */
.ps__modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
}
.ps__modal-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}
.ps__modal-panel {
  position: relative;
  width: 100%;
  max-height: 86vh;
  background: #fff;
  border-radius: 20rpx 20rpx 0 0;
  display: flex;
  flex-direction: column;
}
.ps__modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid #f0f1f3;
}
.ps__modal-title {
  font-size: 30rpx;
  font-weight: 800;
  color: #172033;
}
.ps__modal-body {
  flex: 1;
  padding: 18rpx 28rpx;
}
.ps__form-row {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 18rpx;
}
.ps__form-row--inline {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.ps__form-label {
  font-size: 22rpx;
  color: #5a6275;
  font-weight: 600;
}
.ps__picker {
  padding: 14rpx;
  background: #f7f8fa;
  border: 1rpx solid #e6e9ee;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #172033;
}
.ps__days-pick {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}
.ps__day-pill {
  padding: 10rpx 22rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #5a6275;
}
.ps__day-pill--active {
  background: #b7791f;
  color: #fff;
  border-color: #b7791f;
  font-weight: 700;
}

.ps__sec {
  margin-bottom: 18rpx;
}
.ps__sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 0;
}
.ps__sec-title {
  font-size: 24rpx;
  font-weight: 700;
  color: #172033;
}
.ps__sec-add {
  font-size: 22rpx;
  color: #b7791f;
  font-weight: 700;
}
.ps__slot-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 10rpx;
}
.ps__slot-input {
  flex: 1;
  min-width: 0;
  padding: 12rpx 10rpx;
  background: #f7f8fa;
  border: 1rpx solid #e6e9ee;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #172033;
  text-align: center;
  font-feature-settings: 'tnum';
}
.ps__slot-input--cap {
  flex: 0 0 100rpx;
}
.ps__slot-dash {
  color: #b6bfcd;
}
.ps__slot-del {
  flex-shrink: 0;
  width: 56rpx;
  height: 56rpx;
  border-radius: 8rpx;
  background: #fdecea;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ps__modal-foot {
  display: flex;
  gap: 12rpx;
  padding: 16rpx 28rpx calc(16rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #f0f1f3;
}
.ps__modal-btn {
  flex: 1;
  padding: 22rpx 0;
  border-radius: 10rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 700;
}
.ps__modal-btn--ghost {
  background: #fff;
  color: #5a6275;
  border: 1rpx solid #d8dde4;
}
.ps__modal-btn--primary {
  background: #b7791f;
  color: #fff;
}
.ps__modal-btn--disabled {
  background: #dde2ea;
  color: #b6bfcd;
}
</style>
