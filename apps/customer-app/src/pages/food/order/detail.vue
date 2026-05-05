<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { cancelOrder, getOrderDetail, type OrderDetailVo } from '@/api/food-orders';
import { formatYuan } from '@/utils/format-price';

const orderId = ref('');
const detail = ref<OrderDetailVo | null>(null);
const loading = ref(false);
const cancelOpen = ref(false);
const cancelReason = ref('');
const countdown = ref(0);

const STATUS_LABEL: Record<string, string> = {
  WAIT_PAY: '待支付',
  PAID_WAIT_MERCHANT: '等商家接单',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

const canCancel = computed(() => detail.value?.actions.includes('cancel'));
const canPay = computed(() => detail.value?.actions.includes('pay'));
const canReview = computed(() => detail.value?.actions.includes('review'));

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await getOrderDetail(orderId.value);
    if (r.code === '0' && r.data) detail.value = r.data;
  } finally {
    loading.value = false;
  }
}

async function confirmCancel(): Promise<void> {
  if (!cancelReason.value.trim()) {
    uni.showToast({ title: '请填写取消原因', icon: 'none' });
    return;
  }
  const r = await cancelOrder(orderId.value, cancelReason.value.trim());
  if (r.code === '0') {
    cancelOpen.value = false;
    uni.showToast({ title: '已取消', icon: 'success' });
    void load();
  } else {
    uni.showToast({ title: r.message ?? '取消失败', icon: 'none' });
  }
}

function gotoPay(): void {
  uni.navigateTo({ url: '/pages/payment/cashier?orderId=' + orderId.value });
}
function gotoTrack(): void {
  uni.navigateTo({ url: '/pages/food/order/track?orderId=' + orderId.value });
}
function gotoReview(): void {
  uni.navigateTo({ url: '/pages/food/review/submit?orderId=' + orderId.value });
}

function tickCountdown(): void {
  setInterval(() => {
    if (!detail.value || detail.value.status !== 'WAIT_PAY') return;
    const remaining = Math.max(0, detail.value.expireAt - Date.now());
    countdown.value = Math.floor(remaining / 1000);
  }, 1000);
}

onMounted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts = (uni as any).getLaunchOptionsSync?.() ?? {};
  orderId.value = (opts.query?.orderId ?? '') as string;
  tickCountdown();
  void load();
});
</script>

<template>
  <view class="order-detail" v-if="detail">
    <view class="order-detail__header">
      <text class="order-detail__status">{{ STATUS_LABEL[detail.status] ?? detail.status }}</text>
      <text v-if="detail.status === 'WAIT_PAY' && countdown > 0" class="order-detail__countdown">
        剩余 {{ Math.floor(countdown / 60) }}:{{ String(countdown % 60).padStart(2, '0') }}
      </text>
    </view>
    <view class="order-detail__no">订单号 {{ detail.orderNo }}</view>
    <view class="order-detail__items">
      <view v-for="it in detail.items" :key="it.skuId" class="order-detail__item">
        <text>{{ it.name }} {{ it.spec }} × {{ it.quantity }}</text>
        <text>¥ {{ formatYuan(it.subTotal) }}</text>
      </view>
    </view>
    <view class="order-detail__amount">
      <view
        ><text>商品</text><text>¥ {{ formatYuan(detail.goodsAmount) }}</text></view
      >
      <view
        ><text>配送费</text><text>¥ {{ formatYuan(detail.deliveryFee) }}</text></view
      >
      <view class="order-detail__pay"
        ><text>合计</text><text>¥ {{ formatYuan(detail.payableAmount) }}</text></view
      >
    </view>
    <view class="order-detail__timeline">
      <view class="order-detail__title">状态时间线</view>
      <view v-for="(t, i) in detail.timeline" :key="i" class="order-detail__t-row">
        <text>{{ t.toStatus }}</text>
        <text>{{ new Date(t.createdAt).toLocaleString() }}</text>
      </view>
    </view>
    <view class="order-detail__actions">
      <button v-if="canPay" type="warn" @tap="gotoPay">去支付</button>
      <button v-if="canCancel" @tap="cancelOpen = true">取消订单</button>
      <button v-if="['RIDER_ASSIGNED', 'PICKED_UP', 'DELIVERING'].includes(detail.status)" @tap="gotoTrack">
        查看轨迹
      </button>
      <button v-if="canReview" type="primary" @tap="gotoReview">去评价</button>
    </view>

    <view v-if="cancelOpen" class="order-detail__dialog">
      <view class="order-detail__mask" @tap="cancelOpen = false" />
      <view class="order-detail__modal">
        <view class="order-detail__title">取消订单</view>
        <textarea v-model="cancelReason" placeholder="请填写取消原因(必填)" maxlength="255" />
        <view class="order-detail__btns">
          <button @tap="cancelOpen = false">取消</button>
          <button type="warn" @tap="confirmCancel">确认取消</button>
        </view>
      </view>
    </view>
  </view>
  <view v-else-if="loading" class="order-detail__loading">加载中…</view>
</template>

<style scoped>
.order-detail {
  padding: 20rpx;
}
.order-detail__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ff6633;
  color: #fff;
  padding: 30rpx;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}
.order-detail__status {
  font-size: 36rpx;
  font-weight: 600;
}
.order-detail__no,
.order-detail__items,
.order-detail__amount,
.order-detail__timeline {
  background: #fff;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
}
.order-detail__item,
.order-detail__t-row,
.order-detail__amount > view {
  display: flex;
  justify-content: space-between;
  padding: 10rpx 0;
}
.order-detail__pay {
  font-weight: 600;
  color: #ff6633;
}
.order-detail__title {
  font-weight: 600;
  margin-bottom: 12rpx;
}
.order-detail__actions {
  display: flex;
  gap: 12rpx;
  margin-top: 20rpx;
  flex-wrap: wrap;
}
.order-detail__dialog {
  position: fixed;
  inset: 0;
}
.order-detail__mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}
.order-detail__modal {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #fff;
  padding: 40rpx;
  border-radius: 16rpx;
  width: 80%;
}
.order-detail__btns {
  display: flex;
  gap: 12rpx;
  margin-top: 20rpx;
}
.order-detail__loading {
  text-align: center;
  padding: 100rpx 0;
  color: #888;
}
</style>
