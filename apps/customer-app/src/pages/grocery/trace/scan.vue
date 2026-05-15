<script setup lang="ts">
/**
 * GR-5 扫码识别页
 */
import { onMounted, ref } from 'vue';

const manualCode = ref('');

function scan(): void {
  uni.scanCode({
    onlyFromCamera: false,
    success: (res) => {
      gotoDetail(res.result);
    },
    fail: () => {
      uni.showToast({ title: '扫码取消或失败', icon: 'none' });
    },
  });
}

function submitManual(): void {
  if (!manualCode.value.trim()) {
    uni.showToast({ title: '请输入二维码内容', icon: 'none' });
    return;
  }
  gotoDetail(manualCode.value.trim());
}

function gotoDetail(code: string): void {
  uni.navigateTo({ url: `/pages/grocery/trace/detail?code=${encodeURIComponent(code)}` });
}

onMounted(() => {});
</script>

<template>
  <view class="scan">
    <view class="scan__hero">
      <text class="scan__title">生鲜溯源查询</text>
      <text class="scan__subtitle">扫码或输入二维码,查看一鸡一档</text>
    </view>

    <button class="scan__btn" @click="scan">📷 扫一扫</button>

    <view class="scan__divider"><text>或手动输入</text></view>

    <view class="scan__manual">
      <input v-model="manualCode" class="scan__input" placeholder="例如:O2OG-XXXX-XXXXXX-XX" />
      <button class="scan__manual-btn" @click="submitManual">查询</button>
    </view>

    <view class="scan__tips">
      <text>· 每只鸡都有独立的二维码</text>
      <text>· 扫码可查看养殖、检疫、出栏全过程</text>
      <text>· 公开查询无需登录</text>
    </view>
  </view>
</template>

<style scoped>
.scan {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 0 0 100rpx;
}
.scan__hero {
  padding: 56rpx 32rpx;
  background: linear-gradient(135deg, #5fbe7d, #2e9c5d);
  color: #fff;
}
.scan__title {
  font-size: 44rpx;
  font-weight: 800;
}
.scan__subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  opacity: 0.9;
}
.scan__btn {
  margin: 40rpx 24rpx 0;
  padding: 36rpx 0;
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  border-radius: 24rpx;
  border: none;
}
.scan__divider {
  margin: 32rpx 0 16rpx;
  text-align: center;
  color: #94a3b8;
  font-size: 22rpx;
}
.scan__manual {
  margin: 0 24rpx;
  display: flex;
  gap: 12rpx;
}
.scan__input {
  flex: 1;
  padding: 18rpx 20rpx;
  background: #fff;
  border-radius: 16rpx;
  font-size: 24rpx;
  letter-spacing: 2rpx;
}
.scan__manual-btn {
  padding: 0 32rpx;
  background: #2e9c5d;
  color: #fff;
  border-radius: 16rpx;
  border: none;
}
.scan__tips {
  margin: 40rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.scan__tips text {
  font-size: 24rpx;
  color: #5a6275;
}
</style>
