<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { submitReview } from '@/api/food-orders';

const orderId = ref('');
const rating = ref(5);
const content = ref('');
const anonymous = ref(false);
const submitting = ref(false);

async function submit(): Promise<void> {
  if (rating.value < 1 || rating.value > 5) {
    uni.showToast({ title: '请选择评分', icon: 'none' });
    return;
  }
  if (content.value.length > 500) {
    uni.showToast({ title: '评价不能超过 500 字', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    const r = await submitReview(orderId.value, {
      rating: rating.value,
      content: content.value || undefined,
      anonymous: anonymous.value,
    });
    if (r.code === '0') {
      uni.showToast({ title: '评价提交成功', icon: 'success' });
      setTimeout(() => uni.redirectTo({ url: '/pages/food/order/detail?orderId=' + orderId.value }), 800);
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
  orderId.value = (opts.query?.orderId ?? '') as string;
});
</script>

<template>
  <view class="review">
    <view class="review__title">评价订单</view>
    <view class="review__rating">
      <text v-for="i in 5" :key="i" :class="{ on: i <= rating }" @tap="rating = i">★</text>
    </view>
    <textarea v-model="content" placeholder="说点什么(0-500 字)" maxlength="500" class="review__content" />
    <view class="review__row">
      <checkbox :checked="anonymous" @tap="anonymous = !anonymous" />
      <text>匿名评价</text>
    </view>
    <button type="warn" :loading="submitting" @tap="submit">提交评价</button>
  </view>
</template>

<style scoped>
.review {
  padding: 30rpx;
}
.review__title {
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
}
.review__rating {
  font-size: 60rpx;
  color: #ddd;
  margin: 30rpx 0;
}
.review__rating text.on {
  color: #ffb400;
}
.review__content {
  width: 100%;
  background: #fff;
  padding: 20rpx;
  border-radius: 12rpx;
  height: 240rpx;
  margin-bottom: 20rpx;
}
.review__row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 30rpx;
}
</style>
