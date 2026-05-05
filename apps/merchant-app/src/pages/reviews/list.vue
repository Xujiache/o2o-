<script setup lang="ts">
import { ref } from 'vue';

import { replyReview } from '@/api/reviews';

const showReply = ref(false);
const replyContent = ref('');
const submitting = ref(false);
const targetReviewId = ref('');

// 占位:stage 7 不实现 GET /m/reviews 列表(规划未明确,仅 reply 接口),提示从订单详情进入
function openReply(reviewId: string): void {
  targetReviewId.value = reviewId;
  replyContent.value = '';
  showReply.value = true;
}

async function submit(): Promise<void> {
  if (!replyContent.value.trim()) {
    uni.showToast({ title: '请输入回复内容', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    const r = await replyReview(targetReviewId.value, replyContent.value);
    if (r.code === '0') {
      uni.showToast({ title: '已回复', icon: 'success' });
      showReply.value = false;
    } else {
      uni.showToast({ title: r.message ?? '失败', icon: 'none' });
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="rv">
    <view class="rv__title">评价回复</view>
    <view class="rv__hint">用户提交评价后,商家收到推送,可在订单详情进入此页回复。</view>
    <view class="rv__demo">
      <text>测试入口(stage 7 规划未列 GET /m/reviews,本页仅做回复入口占位)</text>
      <button @tap="openReply('demo-1')">回复测试评价</button>
    </view>

    <view v-if="showReply" class="modal">
      <view class="modal__inner">
        <view class="modal__title">回复评价</view>
        <textarea v-model="replyContent" maxlength="500" />
        <view class="modal__btns">
          <button @tap="showReply = false">取消</button>
          <button type="warn" :loading="submitting" @tap="submit">提交</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.rv {
  padding: 24rpx;
}
.rv__title {
  font-size: 30rpx;
  font-weight: 600;
}
.rv__hint {
  color: #888;
  font-size: 22rpx;
  margin: 16rpx 0;
}
.rv__demo {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
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
