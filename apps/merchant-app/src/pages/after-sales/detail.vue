<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useAfterSaleStore } from '@/stores/after-sale';

const afterSaleId = ref('');
const decision = ref<'APPROVE' | 'REJECT'>('APPROVE');
const rejectReason = ref('');
const submitting = ref(false);

const store = useAfterSaleStore();
const item = ref<{ afterSaleId: string; orderId: string; reason: string; amountCents: string; status: string } | null>(
  null,
);

async function review(): Promise<void> {
  if (decision.value === 'REJECT' && !rejectReason.value.trim()) {
    uni.showToast({ title: '请填写驳回原因', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    const ok = await store.review(afterSaleId.value, decision.value, rejectReason.value || undefined);
    if (ok) {
      uni.showToast({ title: '已审核', icon: 'success' });
      setTimeout(() => uni.navigateBack(), 600);
    }
  } finally {
    submitting.value = false;
  }
}

async function load(): Promise<void> {
  if (store.items.length === 0) await store.refresh();
  const found = store.items.find((a) => a.afterSaleId === afterSaleId.value);
  if (found) {
    item.value = {
      afterSaleId: found.afterSaleId,
      orderId: found.orderId,
      reason: found.reason,
      amountCents: found.amountCents,
      status: found.status,
    };
  }
}

onMounted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts = (uni as any).getLaunchOptionsSync?.() ?? {};
  afterSaleId.value = (opts.query?.afterSaleId ?? '') as string;
  void load();
});
</script>

<template>
  <view class="d">
    <view v-if="item" class="d__card">
      <view class="d__row"
        ><text>订单</text><text>{{ item.orderId }}</text></view
      >
      <view class="d__row"
        ><text>金额</text><text>¥{{ (Number(item.amountCents) / 100).toFixed(2) }}</text></view
      >
      <view class="d__row"
        ><text>原因</text><text>{{ item.reason }}</text></view
      >
      <view class="d__row"
        ><text>状态</text><text>{{ item.status }}</text></view
      >
    </view>
    <view class="d__actions">
      <view class="d__seg">
        <text :class="{ on: decision === 'APPROVE' }" @tap="decision = 'APPROVE'">通过</text>
        <text :class="{ on: decision === 'REJECT' }" @tap="decision = 'REJECT'">驳回</text>
      </view>
      <textarea v-if="decision === 'REJECT'" v-model="rejectReason" placeholder="驳回原因(必填)" maxlength="255" />
      <button type="warn" :loading="submitting" @tap="review">提交审核</button>
    </view>
  </view>
</template>

<style scoped>
.d {
  padding: 16rpx;
}
.d__card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
}
.d__row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.d__row:last-child {
  border-bottom: none;
}
.d__actions {
  margin-top: 24rpx;
}
.d__seg {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.d__seg text {
  flex: 1;
  text-align: center;
  padding: 16rpx;
  background: #f0f0f0;
  border-radius: 8rpx;
}
.d__seg text.on {
  background: #ffb400;
  color: #fff;
}
.d__actions textarea {
  width: 100%;
  background: #fff;
  padding: 16rpx;
  border-radius: 12rpx;
  height: 180rpx;
  margin-bottom: 16rpx;
}
</style>
