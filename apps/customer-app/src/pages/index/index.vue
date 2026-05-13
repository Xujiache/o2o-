<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';

import FloatTabBar from '@/components/common/FloatTabBar.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';

function goGrocery(): void {
  uni.switchTab({ url: '/pages/grocery/home' });
}
function goErrand(): void {
  uni.navigateTo({ url: '/pages/errand/home/index' });
}
function goScan(): void {
  uni.navigateTo({ url: '/pages/trace/scan' });
}

onShow(() => {
  uni.hideTabBar({ animation: false });
});
</script>

<template>
  <view class="page">
    <view class="hero">
      <text class="hero__eyebrow">Fresh & Errand</text>
      <text class="hero__title">本地生鲜 · 同城跑腿</text>
      <text class="hero__subtitle">扫码溯源 · 自提到柜 · 30 分起送</text>
    </view>

    <view class="entry-grid">
      <view class="entry-card entry-card--grocery" @tap="goGrocery">
        <view class="entry-card__icon" :style="{ background: 'linear-gradient(135deg, #11998E, #38EF7D)' }">
          <SvgIcon name="apple" :size="44" color="#fff" />
        </view>
        <text class="entry-card__title">生鲜商城</text>
        <text class="entry-card__desc">每日上新 · 称重精算</text>
        <text class="entry-card__cta">去逛逛 ›</text>
      </view>
      <view class="entry-card entry-card--errand" @tap="goErrand">
        <view class="entry-card__icon" :style="{ background: 'linear-gradient(135deg, #5B5FF8, #00B8D9)' }">
          <SvgIcon name="motorcycle" :size="44" color="#fff" />
        </view>
        <text class="entry-card__title">跑腿服务</text>
        <text class="entry-card__desc">代买 · 代送 · 代办</text>
        <text class="entry-card__cta">立即下单 ›</text>
      </view>
    </view>

    <view class="quick">
      <view class="quick__row" @tap="goScan">
        <view class="quick__icon"><SvgIcon name="radio-tower" :size="36" color="#ff6b35" /></view>
        <view class="quick__main">
          <text class="quick__title">扫码溯源</text>
          <text class="quick__desc">扫商品二维码,查看产地、检测和物流时间轴</text>
        </view>
        <SvgIcon name="chevron-right" :size="28" color="#b6bfcd" />
      </view>
    </view>

    <view class="features">
      <view class="features__title">为什么选我们</view>
      <view class="feature-list">
        <view class="feature-item">
          <view class="feature-item__dot" />
          <view class="feature-item__main">
            <text class="feature-item__title">称重精准</text>
            <text class="feature-item__desc">下单先付预估金额,实际称重后多退少补</text>
          </view>
        </view>
        <view class="feature-item">
          <view class="feature-item__dot" />
          <view class="feature-item__main">
            <text class="feature-item__title">自提便捷</text>
            <text class="feature-item__desc">就近自提点 + 时段预约,6 位提货码 + 二维码</text>
          </view>
        </view>
        <view class="feature-item">
          <view class="feature-item__dot" />
          <view class="feature-item__main">
            <text class="feature-item__title">来源可溯</text>
            <text class="feature-item__desc">扫一扫即可查看产地、批次、检测报告</text>
          </view>
        </view>
      </view>
    </view>

    <FloatTabBar active="home" />
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 0 24rpx 220rpx;
  background: #fff;
  box-sizing: border-box;
}
.hero {
  margin: 24rpx 0;
  padding: 48rpx 36rpx 64rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #11998e, #38ef7d);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  box-shadow: 0 18rpx 48rpx rgba(17, 153, 142, 0.22);
}
.hero__eyebrow {
  font-size: 22rpx;
  letter-spacing: 2rpx;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  align-self: flex-start;
}
.hero__title {
  font-size: 52rpx;
  font-weight: 800;
  margin-top: 20rpx;
}
.hero__subtitle {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.88);
}

.entry-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.entry-card {
  padding: 28rpx 24rpx;
  background: #fff;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  align-items: flex-start;
  box-shadow: 0 14rpx 32rpx rgba(31, 41, 55, 0.08);
}
.entry-card__icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 24rpx rgba(31, 41, 55, 0.12);
}
.entry-card__title {
  font-size: 32rpx;
  font-weight: 800;
  color: #172033;
}
.entry-card__desc {
  font-size: 23rpx;
  color: #8a94a6;
}
.entry-card__cta {
  margin-top: 6rpx;
  font-size: 23rpx;
  color: #11998e;
  font-weight: 700;
}
.entry-card--errand .entry-card__cta {
  color: #5b5ff8;
}

.quick {
  margin-top: 24rpx;
  border-radius: 22rpx;
  background: #fff;
  box-shadow: 0 14rpx 32rpx rgba(31, 41, 55, 0.06);
}
.quick__row {
  padding: 26rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
}
.quick__icon {
  width: 76rpx;
  height: 76rpx;
  border-radius: 20rpx;
  background: rgba(255, 107, 53, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}
.quick__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}
.quick__title {
  font-size: 28rpx;
  font-weight: 800;
  color: #172033;
}
.quick__desc {
  font-size: 23rpx;
  color: #8a94a6;
}

.features {
  margin-top: 24rpx;
  padding: 26rpx 24rpx 12rpx;
  border-radius: 22rpx;
  background: #fff;
  box-shadow: 0 14rpx 32rpx rgba(31, 41, 55, 0.06);
}
.features__title {
  font-size: 30rpx;
  font-weight: 800;
  color: #172033;
  margin-bottom: 16rpx;
}
.feature-list {
  display: flex;
  flex-direction: column;
}
.feature-item {
  display: flex;
  gap: 18rpx;
  padding: 16rpx 0;
  align-items: flex-start;
  border-bottom: 1rpx solid #f0f2f6;
}
.feature-item:last-child {
  border-bottom: none;
}
.feature-item__dot {
  margin-top: 14rpx;
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #11998e;
  flex-shrink: 0;
}
.feature-item__main {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.feature-item__title {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
}
.feature-item__desc {
  font-size: 23rpx;
  color: #8a94a6;
  line-height: 1.45;
}
</style>
