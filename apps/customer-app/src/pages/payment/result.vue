<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useFoodPaymentStore } from '@/stores/food-payment';

const payStore = useFoodPaymentStore();
const orderId = ref('');
const result = ref<'success' | 'fail'>('success');

function gotoOrderDetail(): void {
  uni.redirectTo({ url: '/pages/food/order/detail?orderId=' + orderId.value });
}
function retry(): void {
  uni.redirectTo({ url: '/pages/payment/cashier?orderId=' + orderId.value });
}

onMounted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts = (uni as any).getLaunchOptionsSync?.() ?? {};
  orderId.value = (opts.query?.orderId ?? '') as string;
  result.value = payStore.result === 'fail' ? 'fail' : 'success';
});
</script>

<template>
  <view class="result">
    <view class="result__icon">{{ result === 'success' ? '✅' : '❌' }}</view>
    <view class="result__text">{{ result === 'success' ? '支付成功' : '支付失败' }}</view>
    <view class="result__actions">
      <button v-if="result === 'success'" type="primary" @tap="gotoOrderDetail">查看订单</button>
      <button v-else type="warn" @tap="retry">重新支付</button>
    </view>
  </view>
</template>

<style scoped>
.result {
  padding: 80rpx 40rpx;
  text-align: center;
}
.result__icon {
  font-size: 120rpx;
}
.result__text {
  font-size: 36rpx;
  font-weight: 600;
  margin: 30rpx 0;
}
.result__actions {
  margin-top: 60rpx;
}
</style>
