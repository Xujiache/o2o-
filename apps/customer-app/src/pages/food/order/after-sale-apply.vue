<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { ref } from 'vue';

import { applyAfterSale } from '@/api/food-after-sale';
import NavBar from '@/components/common/NavBar.vue';

const orderId = ref('');
const type = ref<'REFUND' | 'EXCHANGE'>('REFUND');
const reason = ref('');
const amountYuan = ref('');
const submitting = ref(false);

async function submit(): Promise<void> {
  if (!reason.value || reason.value.trim().length === 0) {
    uni.showToast({ title: '请填写原因', icon: 'none' });
    return;
  }
  const cents = Math.round(Number(amountYuan.value) * 100);
  if (!Number.isFinite(cents) || cents <= 0) {
    uni.showToast({ title: '请填写正确金额', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    const r = await applyAfterSale({
      orderId: orderId.value,
      type: type.value,
      reason: reason.value,
      amountCents: cents,
    });
    if (r.code === '0') {
      uni.showToast({ title: '已提交,等待商家审核', icon: 'success' });
      setTimeout(() => uni.redirectTo({ url: '/pages/food/order/detail?orderId=' + orderId.value }), 800);
    } else {
      uni.showToast({ title: r.message ?? '提交失败', icon: 'none' });
    }
  } finally {
    submitting.value = false;
  }
}

onLoad((options) => {
  orderId.value = (options?.orderId as string) ?? '';
});
</script>

<template>
  <view class="apply">
    <NavBar title="申请售后" />
    <view class="apply__title">申请售后</view>
    <view class="apply__row">
      <text class="apply__label">类型</text>
      <view class="apply__seg">
        <text :class="{ on: type === 'REFUND' }" @tap="type = 'REFUND'">退款</text>
        <text :class="{ on: type === 'EXCHANGE' }" @tap="type = 'EXCHANGE'">换货</text>
      </view>
    </view>
    <view class="apply__row">
      <text class="apply__label">退款金额(元)</text>
      <input v-model="amountYuan" type="digit" placeholder="" class="apply__input" />
    </view>
    <textarea v-model="reason" placeholder="请描述具体原因(必填)" maxlength="255" class="apply__reason" />
    <button type="warn" :loading="submitting" @tap="submit">提交申请</button>
  </view>
</template>

<style scoped>
.apply {
  padding: 30rpx;
}
.apply__title {
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 30rpx;
}
.apply__row {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
  gap: 24rpx;
}
.apply__label {
  width: 200rpx;
  color: #444;
}
.apply__seg {
  display: flex;
  background: #f0f0f0;
  border-radius: 12rpx;
  overflow: hidden;
}
.apply__seg text {
  padding: 12rpx 24rpx;
  color: #666;
}
.apply__seg text.on {
  background: #ffb400;
  color: #fff;
}
.apply__input {
  flex: 1;
  background: #fff;
  padding: 14rpx 20rpx;
  border-radius: 10rpx;
}
.apply__reason {
  width: 100%;
  background: #fff;
  padding: 20rpx;
  border-radius: 12rpx;
  height: 240rpx;
  margin-bottom: 30rpx;
}
</style>
