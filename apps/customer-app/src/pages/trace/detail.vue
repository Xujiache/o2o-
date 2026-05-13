<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import { getTraceInfo, type CustomerTraceInfo, type TraceRecord } from '@/api/trace';

const info = ref<CustomerTraceInfo | null>(null);
const loading = ref(true);
const errorMsg = ref('');

const NODE_META: Record<number, { label: string; icon: string; color: string }> = {
  1: { label: '产地', icon: 'apple', color: '#11998e' },
  2: { label: '加工', icon: 'utensils', color: '#5b5ff8' },
  3: { label: '检测', icon: 'shield-check', color: '#00b8d9' },
  4: { label: '仓储', icon: 'package', color: '#fa709a' },
  5: { label: '物流', icon: 'truck', color: '#ff7a45' },
  6: { label: '上架', icon: 'store', color: '#ff6b35' },
  7: { label: '其他', icon: 'sparkles', color: '#8a94a6' },
};

const records = computed<TraceRecord[]>(() => info.value?.records ?? []);

function getQuery(): { code: string; sig: string } {
  const pages = (getCurrentPages?.() ?? []) as Array<{ options?: { code?: string; sig?: string } }>;
  const opts = pages[pages.length - 1]?.options ?? {};
  return { code: opts.code ?? '', sig: opts.sig ?? '' };
}

function fmtTime(ts: number): string {
  if (!ts) return '--';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(
    d.getHours(),
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDate(ts: number): string {
  if (!ts) return '--';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function load(): Promise<void> {
  loading.value = true;
  errorMsg.value = '';
  const { code, sig } = getQuery();
  if (!code || !sig) {
    errorMsg.value = '链接参数缺失';
    loading.value = false;
    return;
  }
  const r = await getTraceInfo(code, sig);
  if (r.code === '0' && r.data) {
    info.value = r.data;
  } else {
    errorMsg.value = r.message ?? '溯源信息查询失败';
  }
  loading.value = false;
}

onMounted(load);
</script>

<template>
  <view class="page">
    <view v-if="loading" class="loading">加载中...</view>
    <view v-else-if="errorMsg || !info" class="error">
      <SvgIcon name="alert-circle" :size="90" color="#c5c9d2" />
      <text class="error__text">{{ errorMsg || '没有溯源信息' }}</text>
    </view>
    <template v-else>
      <view class="hero">
        <text class="hero__eyebrow">来源可追 · 全程透明</text>
        <text class="hero__title">{{ info.product.name }}</text>
        <view class="hero__meta">
          <view class="hero__meta-item">
            <text class="hero__meta-label">批次号</text>
            <text class="hero__meta-value">{{ info.batch.batchNo }}</text>
          </view>
          <view class="hero__meta-item">
            <text class="hero__meta-label">生产日期</text>
            <text class="hero__meta-value">{{ fmtDate(info.batch.producedAt) }}</text>
          </view>
        </view>
      </view>

      <view class="card">
        <text class="card__title">商品信息</text>
        <view class="card__row"
          ><text>商品</text><text>{{ info.product.name }}</text></view
        >
        <view class="card__row"
          ><text>批次</text><text>{{ info.batch.batchNo }}</text></view
        >
        <view v-if="info.batch.supplierName" class="card__row"
          ><text>供应商</text><text>{{ info.batch.supplierName }}</text></view
        >
        <view v-if="info.batch.shelfLifeDays" class="card__row"
          ><text>保质期</text><text>{{ info.batch.shelfLifeDays }} 天</text></view
        >
        <view class="card__row"
          ><text>已扫码</text><text>{{ info.qr.scanCount }} 次</text></view
        >
      </view>

      <view class="card">
        <text class="card__title">溯源时间轴</text>
        <view v-if="records.length === 0" class="card__empty">商家暂未录入溯源节点</view>
        <view v-for="(r, idx) in records" :key="r.traceRecordId" class="timeline">
          <view class="timeline__col">
            <view class="timeline__dot" :style="{ background: NODE_META[r.nodeType]?.color ?? '#11998e' }">
              <SvgIcon :name="NODE_META[r.nodeType]?.icon ?? 'sparkles'" :size="22" color="#fff" />
            </view>
            <view v-if="idx < records.length - 1" class="timeline__line" />
          </view>
          <view class="timeline__main">
            <view class="timeline__head">
              <text
                class="timeline__chip"
                :style="{
                  background: `${NODE_META[r.nodeType]?.color ?? '#11998e'}22`,
                  color: NODE_META[r.nodeType]?.color ?? '#11998e',
                }"
              >
                {{ NODE_META[r.nodeType]?.label ?? '节点' }}
              </text>
              <text class="timeline__time">{{ fmtTime(r.happenedAt) }}</text>
            </view>
            <text class="timeline__title">{{ r.nodeTitle }}</text>
            <text v-if="r.content" class="timeline__content">{{ r.content }}</text>
            <text v-if="r.operatorName" class="timeline__op">操作员:{{ r.operatorName }}</text>
            <view v-if="r.attachments && r.attachments.length" class="timeline__atts">
              <view v-for="(a, i) in r.attachments" :key="i" class="timeline__att">
                <SvgIcon :name="a.type === 'image' ? 'image' : 'file-edit'" :size="22" color="#5b5ff8" />
                <text>{{ a.name || a.type }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx 24rpx 60rpx;
  box-sizing: border-box;
  background: #fafbfc;
}
.loading,
.error {
  padding: 200rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
}
.loading {
  color: #8a94a6;
  font-size: 26rpx;
}
.error__text {
  color: #8a94a6;
  font-size: 26rpx;
}

.hero {
  padding: 34rpx 30rpx 36rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #11998e, #38ef7d);
  color: #fff;
  box-shadow: 0 18rpx 42rpx rgba(17, 153, 142, 0.22);
}
.hero__eyebrow {
  font-size: 22rpx;
  letter-spacing: 2rpx;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  display: inline-block;
}
.hero__title {
  display: block;
  margin-top: 18rpx;
  font-size: 44rpx;
  font-weight: 800;
}
.hero__meta {
  margin-top: 22rpx;
  display: flex;
  gap: 28rpx;
}
.hero__meta-item {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.hero__meta-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.78);
}
.hero__meta-value {
  font-size: 26rpx;
  font-weight: 700;
}

.card {
  margin-top: 18rpx;
  padding: 24rpx 26rpx;
  background: #fff;
  border-radius: 22rpx;
  box-shadow: 0 14rpx 32rpx rgba(31, 41, 55, 0.06);
}
.card__title {
  display: block;
  font-size: 28rpx;
  font-weight: 800;
  color: #172033;
  margin-bottom: 14rpx;
}
.card__row {
  display: flex;
  justify-content: space-between;
  padding: 10rpx 0;
  color: #5a6275;
  font-size: 26rpx;
}
.card__row text:last-child {
  color: #172033;
}
.card__empty {
  padding: 40rpx 0;
  text-align: center;
  color: #8a94a6;
  font-size: 24rpx;
}

.timeline {
  display: flex;
  gap: 18rpx;
  padding: 14rpx 0;
}
.timeline__col {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 56rpx;
  flex-shrink: 0;
}
.timeline__dot {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 14rpx rgba(31, 41, 55, 0.18);
}
.timeline__line {
  flex: 1;
  width: 3rpx;
  margin-top: 6rpx;
  background: #e8ecf2;
  min-height: 60rpx;
}
.timeline__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding-bottom: 14rpx;
  border-bottom: 1rpx dashed #e8ecf2;
}
.timeline:last-child .timeline__main {
  border-bottom: none;
}
.timeline__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.timeline__chip {
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 700;
}
.timeline__time {
  font-size: 22rpx;
  color: #8a94a6;
}
.timeline__title {
  font-size: 28rpx;
  font-weight: 800;
  color: #172033;
  margin-top: 4rpx;
}
.timeline__content {
  font-size: 24rpx;
  color: #5a6275;
  line-height: 1.5;
}
.timeline__op {
  font-size: 22rpx;
  color: #8a94a6;
}
.timeline__atts {
  margin-top: 6rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}
.timeline__att {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 12rpx;
  font-size: 22rpx;
  color: #5b5ff8;
  background: rgba(91, 95, 248, 0.1);
  border-radius: 999rpx;
}
</style>
