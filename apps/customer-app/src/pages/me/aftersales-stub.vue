<script setup lang="ts">
/**
 * 我的售后 — 售后入口列表页
 * 复用 food-after-sale.ts 的 listAfterSales(全部 bizType)。
 * 后端 GET /c/after-sales 尚未提供时,前端 try-catch 容错,展示空态;
 * 后端 stage 11 后接入即自动可用,无需改前端。
 * 注:pages.json 仍指向 aftersales-stub,不改路径仅改内容。
 */
import { onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';

import { listAfterSales, type AfterSaleListItemVo } from '@/api/food-after-sale';
import SvgIcon from '@/components/common/SvgIcon.vue';
import NavBar from '@/components/common/NavBar.vue';

const list = ref<AfterSaleListItemVo[]>([]);
const loading = ref(false);
const errorMsg = ref('');

const empty = computed<boolean>(() => !loading.value && list.value.length === 0);

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    APPLYING: '申请中',
    APPLIED: '申请中',
    APPROVED: '已通过',
    REJECTED: '已驳回',
    REFUNDING: '退款中',
    REFUNDED: '已退款',
    CLOSED: '已关闭',
    CANCELLED: '已取消',
  };
  return map[s] ?? s;
}

function statusTheme(s: string): 'warn' | 'ok' | 'err' | 'info' {
  if (s === 'APPLYING' || s === 'APPLIED' || s === 'REFUNDING') return 'warn';
  if (s === 'APPROVED' || s === 'REFUNDED') return 'ok';
  if (s === 'REJECTED' || s === 'CANCELLED' || s === 'CLOSED') return 'err';
  return 'info';
}

function typeLabel(t: string): string {
  if (t === 'REFUND') return '退款';
  if (t === 'EXCHANGE') return '换货';
  return t;
}

function bizTypeLabel(b: string): string {
  if (b === 'FOOD') return '美食';
  if (b === 'GROCERY') return '生鲜';
  return b;
}

function formatYuan(cents: number): string {
  if (!Number.isFinite(cents)) return '0.00';
  return (cents / 100).toFixed(2);
}

function formatTime(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(
    d.getHours(),
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function load(): Promise<void> {
  loading.value = true;
  errorMsg.value = '';
  try {
    const r = await listAfterSales({});
    if (r.code === '0' && r.data) {
      list.value = r.data.list ?? [];
    } else {
      // 后端尚未提供 GET 接口或返回业务错 → 空态友好提示,不打扰用户
      list.value = [];
      errorMsg.value = r.message ?? '';
    }
  } catch (err) {
    list.value = [];
    errorMsg.value = err instanceof Error ? err.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

function gotoDetail(item: AfterSaleListItemVo): void {
  // 详情页若 stage 11 后单独建,可改路由;当前先跳关联订单详情
  if (item.bizType === 'GROCERY' && item.orderId) {
    uni.navigateTo({ url: `/pages/grocery/order/detail?orderId=${item.orderId}` });
    return;
  }
  if (item.orderId) {
    uni.navigateTo({ url: `/pages/food/order/detail?orderId=${item.orderId}` });
  }
}

onShow(() => {
  void load();
});
</script>

<template>
  <view class="aftersales">
    <NavBar title="我的售后" />

    <view v-if="loading" class="aftersales__loading">加载中…</view>

    <view v-else-if="empty" class="aftersales__empty">
      <SvgIcon name="life-buoy" :size="96" color="#0f766e" />
      <text class="aftersales__empty-title">暂无售后记录</text>
      <text class="aftersales__empty-msg">如需售后,可在订单详情页发起申请</text>
      <text v-if="errorMsg" class="aftersales__empty-err">{{ errorMsg }}</text>
    </view>

    <view v-else class="aftersales__list">
      <view v-for="item in list" :key="item.afterSaleId" class="card" @tap="gotoDetail(item)">
        <view class="card__head">
          <text class="card__biz">{{ bizTypeLabel(item.bizType) }} · {{ typeLabel(item.type) }}</text>
          <text class="card__status" :class="`card__status--${statusTheme(item.status)}`">
            {{ statusLabel(item.status) }}
          </text>
        </view>
        <view class="card__order">订单 {{ item.orderNo ?? item.orderId }}</view>
        <view class="card__reason">{{ item.reason }}</view>
        <view class="card__foot">
          <text class="card__amount">¥{{ formatYuan(item.amountCents) }}</text>
          <text class="card__time">{{ formatTime(item.appliedAt) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.aftersales {
  min-height: 100vh;
  background: #f5f6f8;
}
.aftersales__loading {
  padding: 160rpx 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 26rpx;
}
.aftersales__empty {
  padding: 160rpx 40rpx 80rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
}
.aftersales__empty-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-primary);
  margin-top: 16rpx;
}
.aftersales__empty-msg {
  font-size: 24rpx;
  color: var(--text-muted);
}
.aftersales__empty-err {
  font-size: 22rpx;
  color: #c5c9d2;
  margin-top: 8rpx;
}

.aftersales__list {
  padding: 20rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, 0.05);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card__biz {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-primary);
}
.card__status {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
}
.card__status--warn {
  background: rgba(46, 156, 93, 0.12);
  color: var(--brand-primary);
}
.card__status--ok {
  background: rgba(17, 153, 142, 0.12);
  color: #11998e;
}
.card__status--err {
  background: rgba(143, 156, 169, 0.16);
  color: var(--text-secondary);
}
.card__status--info {
  background: rgba(46, 156, 93, 0.12);
  color: var(--brand-primary);
}
.card__order {
  font-size: 22rpx;
  color: var(--text-muted);
}
.card__reason {
  font-size: 26rpx;
  color: var(--text-secondary);
  line-height: 1.5;
}
.card__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4rpx;
}
.card__amount {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--brand-primary);
}
.card__time {
  font-size: 22rpx;
  color: var(--text-muted);
}
</style>
