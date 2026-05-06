<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useTaskStore } from '@/stores/task';

const store = useTaskStore();
const taskId = ref('');
const pickupCode = ref('');
const itemCheckResult = ref('OK');
const submitting = ref(false);

async function submit(): Promise<void> {
  if (!pickupCode.value) {
    uni.showToast({ title: '请输入取件码', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    const ok = await store.pickup(taskId.value, {
      pickupCode: pickupCode.value,
      itemCheckResult: itemCheckResult.value,
    });
    if (ok) {
      uni.showToast({ title: '已取件', icon: 'success' });
      setTimeout(() => uni.redirectTo({ url: `/pages/tasks/current?taskId=${taskId.value}` }), 600);
    } else {
      uni.showToast({ title: '操作失败', icon: 'none' });
    }
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts = (uni as any).getLaunchOptionsSync?.() ?? {};
  taskId.value = (opts.query?.taskId ?? '') as string;
});
</script>

<template>
  <view class="p">
    <view class="p__title">跑腿取件核验</view>
    <view class="p__row">
      <text>取件码</text>
      <input v-model="pickupCode" placeholder="请向客户索取取件码" />
    </view>
    <view class="p__row">
      <text>核验结果</text>
      <input v-model="itemCheckResult" />
    </view>
    <button type="primary" :loading="submitting" @tap="submit">确认取件</button>
  </view>
</template>

<style scoped>
.p {
  padding: 24rpx;
}
.p__title {
  font-size: 32rpx;
  font-weight: 600;
  padding: 16rpx 0;
}
.p__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
}
.p__row input {
  background: #fff;
  padding: 14rpx 20rpx;
  border-radius: 10rpx;
  flex: 1;
  margin-left: 16rpx;
}
</style>
