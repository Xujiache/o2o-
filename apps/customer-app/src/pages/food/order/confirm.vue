<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { previewOrder, type PreviewVo, submitOrder } from '@/api/food-orders';
import { useFoodCartStore } from '@/stores/food-cart';
import { useFoodOrderStore } from '@/stores/food-order';
import { formatYuan } from '@/utils/format-price';

const cart = useFoodCartStore();
const orderStore = useFoodOrderStore();

const storeId = ref('');
const addressId = ref('60001'); // stage 5 简化:默认地址 id
const deliveryType = ref<'instant' | 'reserved'>('instant');
const reservedTime = ref<number | undefined>(undefined);
const payChannel = ref<'wxpay' | 'alipay'>('wxpay');
const remark = ref('');
const preview = ref<PreviewVo | null>(null);
const loading = ref(false);
const submitting = ref(false);

const items = computed(() => cart.cart?.items ?? []);

async function loadPreview(): Promise<void> {
  if (!cart.cart || items.value.length === 0) {
    uni.showToast({ title: '购物车为空', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    const r = await previewOrder({
      storeId: storeId.value,
      items: items.value.map((it) => ({ skuId: it.skuId, quantity: it.quantity })),
      addressId: addressId.value,
      deliveryType: deliveryType.value,
      reservedTime: reservedTime.value,
    });
    if (r.code === '0' && r.data) {
      preview.value = r.data;
      orderStore.setPreview(r.data, storeId.value);
    } else {
      uni.showToast({ title: r.message ?? '试算失败', icon: 'none' });
    }
  } finally {
    loading.value = false;
  }
}

async function submit(): Promise<void> {
  if (!preview.value) return;
  submitting.value = true;
  try {
    const r = await submitOrder({
      previewId: preview.value.previewId,
      payChannel: payChannel.value,
      remark: remark.value || undefined,
    });
    if (r.code === '0' && r.data) {
      orderStore.setSubmitted(r.data);
      orderStore.setPayChannel(payChannel.value);
      cart.clear();
      uni.redirectTo({ url: '/pages/payment/cashier?orderId=' + r.data.orderId });
    } else {
      uni.showToast({ title: r.message ?? '提交失败', icon: 'none' });
    }
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts = (uni as any).getLaunchOptionsSync?.() ?? {};
  storeId.value = (opts.query?.storeId ?? cart.currentStoreId ?? '') as string;
  void loadPreview();
});
</script>

<template>
  <view class="confirm">
    <view class="confirm__title">确认订单</view>
    <view class="confirm__row">
      <text>地址</text>
      <text>地址 #{{ addressId }}(stage 5 默认)</text>
    </view>
    <view class="confirm__row">
      <text>配送方式</text>
      <picker
        :range="['即时配送', '预约配送']"
        :value="deliveryType === 'instant' ? 0 : 1"
        @change="
          deliveryType = $event.detail.value === 0 ? 'instant' : 'reserved';
          loadPreview();
        "
      >
        {{ deliveryType === 'instant' ? '即时' : '预约' }}
      </picker>
    </view>
    <view class="confirm__row confirm__row--disabled">
      <text>优惠券</text>
      <text>暂无可用</text>
    </view>
    <view class="confirm__row confirm__row--disabled">
      <text>积分抵扣</text>
      <text>暂未开放</text>
    </view>
    <view class="confirm__items">
      <view v-for="it in items" :key="it.cartItemId" class="confirm__item">
        <text>{{ it.name }} {{ it.specValue }} × {{ it.quantity }}</text>
        <text>¥ {{ formatYuan(it.subTotal) }}</text>
      </view>
    </view>
    <view v-if="preview" class="confirm__amount">
      <view
        ><text>商品</text><text>¥ {{ formatYuan(preview.goodsAmount) }}</text></view
      >
      <view
        ><text>配送费</text><text>¥ {{ formatYuan(preview.deliveryFee) }}</text></view
      >
      <view class="confirm__pay"
        ><text>合计</text><text>¥ {{ formatYuan(preview.payableAmount) }}</text></view
      >
    </view>
    <view class="confirm__channel">
      <text>支付方式</text>
      <text :class="{ active: payChannel === 'wxpay' }" @tap="payChannel = 'wxpay'">微信</text>
      <text :class="{ active: payChannel === 'alipay' }" @tap="payChannel = 'alipay'">支付宝</text>
    </view>
    <button type="warn" :loading="submitting" :disabled="!preview" @tap="submit">提交订单</button>
  </view>
</template>

<style scoped>
.confirm {
  padding: 20rpx;
}
.confirm__title {
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
}
.confirm__row {
  background: #fff;
  padding: 24rpx;
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
  border-radius: 12rpx;
}
.confirm__row--disabled {
  color: #999;
}
.confirm__items {
  background: #fff;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
}
.confirm__item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.confirm__amount {
  background: #fff;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}
.confirm__amount > view {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.confirm__pay {
  font-weight: 600;
  color: #ff6633;
}
.confirm__channel {
  display: flex;
  gap: 20rpx;
  align-items: center;
  background: #fff;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}
.confirm__channel text.active {
  color: #1989fa;
  font-weight: 600;
}
</style>
