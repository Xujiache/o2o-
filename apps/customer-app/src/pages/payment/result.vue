<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { onMounted, ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import { useFoodPaymentStore } from '@/stores/food-payment';
import NavBar from '@/components/common/NavBar.vue';

const payStore = useFoodPaymentStore();
const orderId = ref('');
const result = ref<'success' | 'fail'>('success');

function gotoOrderDetail(): void {
  uni.redirectTo({ url: '/pages/food/order/detail?orderId=' + orderId.value });
}
function retry(): void {
  uni.redirectTo({ url: '/pages/payment/cashier?orderId=' + orderId.value });
}

onLoad((options) => {
  orderId.value = (options?.orderId as string) ?? '';
});

onMounted(() => {
  result.value = payStore.result === 'fail' ? 'fail' : 'success';
});
</script>

<template>
  <view class="result">
    <NavBar title="支付结果" />
    <view class="result__icon" :class="result === 'success' ? 'result__icon--ok' : 'result__icon--err'">
      <SvgIcon :name="result === 'success' ? 'check-circle' : 'close'" :size="200" />
    </view>
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
  display: flex;
  justify-content: center;
}
.result__icon--ok {
  color: #07c160;
}
.result__icon--err {
  color: #d33;
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
