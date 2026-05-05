<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useOrderStore } from '@/stores/order';
import { labelOrderStatus, nextActionsForMerchant } from '@/utils/food-order-status';

const orderStore = useOrderStore();
const orderId = ref('');
const showReject = ref(false);
const showReady = ref(false);
const rejectReason = ref('');
const readyRemark = ref('');
const submitting = ref(false);

const order = ref<{ orderId: string; orderNo: string; status: string } | null>(null);

function fmt(cents: string): string {
  return (Number(cents) / 100).toFixed(2);
}

async function load(): Promise<void> {
  await orderStore.refresh();
  const found = orderStore.pending.find((o) => o.orderId === orderId.value);
  if (found) {
    order.value = { orderId: found.orderId, orderNo: found.orderNo, status: found.status };
  } else {
    order.value = { orderId: orderId.value, orderNo: '-', status: 'UNKNOWN' };
  }
}

async function accept(): Promise<void> {
  submitting.value = true;
  try {
    const ok = await orderStore.accept(orderId.value);
    if (ok) {
      uni.showToast({ title: '已接单', icon: 'success' });
      setTimeout(() => uni.navigateBack(), 600);
    } else {
      uni.showToast({ title: '操作失败', icon: 'none' });
    }
  } finally {
    submitting.value = false;
  }
}

async function reject(): Promise<void> {
  if (!rejectReason.value.trim()) {
    uni.showToast({ title: '请填写拒单原因', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    const ok = await orderStore.reject(orderId.value, rejectReason.value);
    if (ok) {
      uni.showToast({ title: '已拒单', icon: 'success' });
      setTimeout(() => uni.navigateBack(), 600);
    }
  } finally {
    submitting.value = false;
    showReject.value = false;
  }
}

async function markReady(): Promise<void> {
  submitting.value = true;
  try {
    const ok = await orderStore.markReady(orderId.value, readyRemark.value || undefined);
    if (ok) {
      uni.showToast({ title: '已出餐', icon: 'success' });
      setTimeout(() => uni.navigateBack(), 600);
    }
  } finally {
    submitting.value = false;
    showReady.value = false;
  }
}

onMounted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts = (uni as any).getLaunchOptionsSync?.() ?? {};
  orderId.value = (opts.query?.orderId ?? '') as string;
  void load();
});
</script>

<template>
  <view class="detail">
    <view v-if="order" class="detail__card">
      <view class="detail__row"
        ><text>订单号</text><text>{{ order.orderNo }}</text></view
      >
      <view class="detail__row"
        ><text>状态</text><text>{{ labelOrderStatus(order.status) }}</text></view
      >
    </view>
    <view class="detail__actions">
      <button
        v-if="nextActionsForMerchant(order?.status ?? '').includes('accept')"
        type="warn"
        :loading="submitting"
        @tap="accept"
      >
        接单
      </button>
      <button
        v-if="nextActionsForMerchant(order?.status ?? '').includes('reject')"
        :loading="submitting"
        @tap="showReject = true"
      >
        拒单
      </button>
      <button
        v-if="nextActionsForMerchant(order?.status ?? '').includes('ready')"
        type="primary"
        :loading="submitting"
        @tap="showReady = true"
      >
        出餐
      </button>
    </view>

    <view v-if="showReject" class="modal">
      <view class="modal__inner">
        <view class="modal__title">拒单原因</view>
        <textarea v-model="rejectReason" maxlength="255" />
        <view class="modal__btns">
          <button @tap="showReject = false">取消</button>
          <button type="warn" @tap="reject">提交</button>
        </view>
      </view>
    </view>

    <view v-if="showReady" class="modal">
      <view class="modal__inner">
        <view class="modal__title">出餐确认</view>
        <textarea v-model="readyRemark" maxlength="255" placeholder="可选备注" />
        <view class="modal__btns">
          <button @tap="showReady = false">取消</button>
          <button type="primary" @tap="markReady">确认出餐</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.detail {
  padding: 16rpx;
}
.detail__card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
}
.detail__row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.detail__row:last-child {
  border-bottom: none;
}
.detail__actions {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}
.detail__actions button {
  flex: 1;
}
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal__inner {
  background: #fff;
  width: 80%;
  border-radius: 12rpx;
  padding: 24rpx;
}
.modal__title {
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
}
.modal__inner textarea {
  width: 100%;
  background: #f5f5f5;
  padding: 16rpx;
  border-radius: 8rpx;
  height: 180rpx;
}
.modal__btns {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}
.modal__btns button {
  flex: 1;
}
</style>
