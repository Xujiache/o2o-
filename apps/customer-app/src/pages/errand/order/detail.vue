<template>
  <view class="page">
    <view v-if="!detail" class="empty">加载中...</view>
    <view v-else>
      <view class="head">
        <text class="title">{{ typeLabel(detail.typeCode) }} · {{ detail.orderNo }}</text>
        <text class="status">{{ statusLabel(detail.status) }}</text>
      </view>
      <view class="section">
        <text class="section-title">订单信息</text>
        <text>取货地址:{{ detail.pickupAddress ?? '-' }}</text>
        <text>送达地址:{{ detail.deliveryAddress }}</text>
        <text v-if="detail.itemDesc">物品:{{ detail.itemDesc }}</text>
        <text v-if="detail.taskDesc">任务:{{ detail.taskDesc }}</text>
        <text>距离:{{ detail.distanceMeters }} m</text>
      </view>
      <view class="section">
        <text class="section-title">价格</text>
        <view class="row">
          <text>基础费</text><text>¥{{ formatYuan(detail.baseFee) }}</text>
        </view>
        <view class="row">
          <text>距离费</text><text>¥{{ formatYuan(detail.distanceFee) }}</text>
        </view>
        <view class="row">
          <text>加急/重量费</text><text>¥{{ formatYuan(detail.urgentFee) }}</text>
        </view>
        <view class="row total">
          <text>应付</text><text>¥{{ formatYuan(detail.payableAmount) }}</text>
        </view>
      </view>
      <view class="section">
        <text class="section-title">时间线</text>
        <view v-for="t in detail.timeline" :key="t.createdAt" class="timeline-item">
          <text class="ts">{{ formatTime(t.createdAt) }}</text>
          <text>{{ t.eventType }}</text>
        </view>
      </view>
      <view class="actions">
        <button v-if="detail.actions.includes('cancel')" @click="onCancel">取消订单</button>
        <button v-if="detail.actions.includes('urgent')" @click="onUrgent">加急</button>
        <button v-if="detail.actions.includes('remark')" @click="onRemark">补充备注</button>
        <button v-if="detail.actions.includes('track')" @click="goTrack">查看轨迹</button>
        <button @click="goAfterSales">售后</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { cancelErrandOrder, remarkErrandOrder, urgentErrandOrder } from '@/api/errand-orders';
import { useErrandOrderStore } from '@/stores/errand-order';
import { statusLabel, typeLabel } from '@/utils/errand-status';
import { formatYuan } from '@/utils/format-price';

const store = useErrandOrderStore();
const detail = ref(store.detail);
const orderId = ref('');

function getQueryOrderId(): string {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const pages = (getCurrentPages?.() ?? []) as any[];
  const last = pages[pages.length - 1] as { options?: { orderId?: string } } | undefined;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return last?.options?.orderId ?? '';
}

async function load(): Promise<void> {
  orderId.value = getQueryOrderId();
  if (!orderId.value) return;
  const d = await store.loadDetail(orderId.value);
  detail.value = d;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function onCancel(): Promise<void> {
  const res = await uni.showModal({ title: '取消订单', content: '确定要取消吗?' });
  if (!res.confirm) return;
  await cancelErrandOrder(orderId.value, 'USER_CANCEL');
  await load();
}

async function onUrgent(): Promise<void> {
  const res = await uni.showActionSheet({ itemList: ['加急(+5 元)', '特急(+10 元)'] });
  if (res.errMsg.endsWith('cancel') || !detail.value) return;
  const level = res.tapIndex === 0 ? 'fast' : 'express';
  const fee = res.tapIndex === 0 ? 500 : 1000;
  const r = await urgentErrandOrder(orderId.value, { urgentLevel: level, confirmFee: fee });
  if (r.code !== '0') uni.showToast({ title: r.message ?? '加急失败', icon: 'none' });
  await load();
}

async function onRemark(): Promise<void> {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const res = await (uni.showModal as any)({
    title: '补充备注',
    editable: true,
    placeholderText: '请输入备注',
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (!res.confirm || !res.content) return;
  await remarkErrandOrder(orderId.value, { remark: res.content });
  await load();
}

function goTrack(): void {
  uni.navigateTo({ url: `/pages/errand/track/index?orderId=${orderId.value}` });
}
function goAfterSales(): void {
  uni.navigateTo({ url: '/pages/me/aftersales-stub' });
}

onMounted(load);
</script>

<style scoped>
.page {
  padding: 16px;
}
.empty {
  padding: 40px 0;
  text-align: center;
  color: #888;
}
.head {
  display: flex;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}
.title {
  font-weight: bold;
  font-size: 18px;
}
.status {
  color: #1a73e8;
  font-size: 14px;
}
.section {
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}
.section-title {
  display: block;
  font-weight: bold;
  margin-bottom: 6px;
}
.row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}
.row.total {
  font-weight: bold;
}
.timeline-item {
  padding: 6px 0;
  font-size: 13px;
}
.ts {
  color: #888;
  margin-right: 8px;
}
.actions {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
