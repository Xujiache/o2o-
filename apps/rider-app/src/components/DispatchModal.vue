<script setup lang="ts">
/**
 * 派单弹窗 — 接单大厅或工作台监听到 DispatchStarted push 后弹出。
 * 展示派单信息与抢单按钮。
 */
import { ref } from 'vue';

import { acceptTask } from '@/api/rider-tasks';

defineProps<{
  visible: boolean;
  dispatchTaskId: string;
  bizType: 'FOOD' | 'ERRAND';
  bizOrderId: string;
}>();
const emit = defineEmits<{ 'update:visible': [boolean]; accepted: [string] }>();

const submitting = ref(false);

async function snatch(dispatchTaskId: string): Promise<void> {
  submitting.value = true;
  try {
    const r = await acceptTask(dispatchTaskId);
    if (r.code === '0' && r.data) {
      emit('accepted', r.data.taskId);
      emit('update:visible', false);
    } else {
      uni.showToast({ title: r.message ?? '已被其他骑手抢走', icon: 'none' });
    }
  } finally {
    submitting.value = false;
  }
}

function close(): void {
  emit('update:visible', false);
}
</script>

<template>
  <view v-if="visible" class="modal">
    <view class="modal__inner">
      <view class="modal__title">{{ bizType === 'FOOD' ? '新外卖派单' : '新跑腿派单' }}</view>
      <view class="modal__row">订单 {{ bizOrderId }}</view>
      <view class="modal__btns">
        <button @tap="close">忽略</button>
        <button class="modal__btn--primary" :loading="submitting" @tap="snatch(dispatchTaskId)">抢单</button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal__inner {
  background: #fff;
  border-radius: 12rpx;
  padding: 32rpx;
  width: 80%;
}
.modal__title {
  font-size: 36rpx;
  font-weight: 600;
}
.modal__row {
  padding: 16rpx 0;
}
.modal__btns {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}
.modal__btns button {
  flex: 1;
}
.modal__btn--primary {
  background: var(--brand-primary);
  color: #fff;
}
</style>
