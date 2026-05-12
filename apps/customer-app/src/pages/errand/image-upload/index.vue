<script setup lang="ts">
import { ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';

const files = ref<string[]>([]);

function chooseImage(): void {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  uni.chooseImage?.({
    count: 9,
    success: (r: any) => {
      const paths: string[] = r.tempFilePaths ?? [];
      files.value = files.value.concat(paths);
    },
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

function removeFile(idx: number): void {
  files.value.splice(idx, 1);
}

function done(): void {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const channel = (getCurrentPages?.() ?? []).slice(-1)[0]?.getOpenerEventChannel?.() as any;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (channel?.emit) {
    channel.emit('files:selected', { fileIds: files.value });
  }
  uni.navigateBack();
}
</script>

<template>
  <view class="upload">
    <view class="upload__hero">
      <text class="upload__eyebrow">图片上传</text>
      <text class="upload__title">添加任务相关图片</text>
      <text class="upload__subtitle">最多 9 张,可上传商品图、地址截图等</text>
    </view>

    <view class="upload__card">
      <view class="upload__grid">
        <view v-for="(f, i) in files" :key="i" class="upload__item">
          <image :src="f" class="upload__img" mode="aspectFill" />
          <view class="upload__close" @click="removeFile(i)">×</view>
        </view>
        <view v-if="files.length < 9" class="upload__add" @click="chooseImage">
          <text class="upload__add-icon">+</text>
          <text class="upload__add-text">添加图片</text>
        </view>
      </view>
      <text class="upload__count">已选 {{ files.length }} / 9</text>
    </view>

    <view class="upload__hint">
      <SvgIcon name="lightbulb" :size="24" color="#ffb400" />
      <text class="upload__hint-text">当前为简化版,真实文件上传将接入对象存储</text>
    </view>

    <view class="upload__bar">
      <button class="upload__cta" :disabled="files.length === 0" @click="done">完成({{ files.length }} 张)</button>
    </view>
  </view>
</template>

<style scoped>
.upload {
  min-height: 100vh;
  padding: 0 0 200rpx;
  background: #fff;
}
.upload__hero {
  padding: 40rpx 32rpx 56rpx;
  background: linear-gradient(135deg, #5b5ff8 0%, #00b8d9 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.upload__eyebrow {
  font-size: 22rpx;
  letter-spacing: 1rpx;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  align-self: flex-start;
}
.upload__title {
  font-size: 40rpx;
  font-weight: 800;
  margin-top: 18rpx;
}
.upload__subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.86);
}

.upload__card {
  margin: -28rpx 24rpx 0;
  padding: 28rpx;
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.08);
}
.upload__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}
.upload__item {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 16rpx;
  overflow: hidden;
}
.upload__img {
  width: 100%;
  height: 100%;
}
.upload__close {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 28rpx;
  line-height: 36rpx;
  text-align: center;
}
.upload__add {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 16rpx;
  background: #fff;
  border: 2rpx dashed rgba(31, 41, 55, 0.16);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  color: #5a6275;
}
.upload__add-icon {
  font-size: 56rpx;
  font-weight: 300;
  color: #c5c9d2;
  line-height: 1;
}
.upload__add-text {
  font-size: 22rpx;
}
.upload__count {
  display: block;
  margin-top: 16rpx;
  text-align: center;
  font-size: 22rpx;
  color: #8a94a6;
}

.upload__hint {
  margin: 24rpx;
  padding: 20rpx 24rpx;
  background: rgba(91, 95, 248, 0.06);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.upload__hint-icon {
  font-size: 28rpx;
}
.upload__hint-text {
  font-size: 22rpx;
  color: #5a6275;
  flex: 1;
  line-height: 1.5;
}

.upload__bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 24rpx calc(env(safe-area-inset-bottom, 0rpx) + 24rpx);
  background: #fff;
  backdrop-filter: blur(12rpx);
  z-index: 50;
}
.upload__cta {
  background: linear-gradient(135deg, #5b5ff8, #00b8d9);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: 999rpx;
  padding: 24rpx 0;
  box-shadow: 0 16rpx 40rpx rgba(91, 95, 248, 0.32);
}
.upload__cta[disabled] {
  opacity: 0.5;
}
</style>
