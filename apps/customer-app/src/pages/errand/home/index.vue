<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import FloatTabBar from '@/components/common/FloatTabBar.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { listErrandTypes, type ErrandTypeVo } from '@/api/errand-types';

const types = ref<ErrandTypeVo[]>([]);

const FORM_PATH: Record<string, string> = {
  BUY: '/pages/errand/form/buy',
  DELIVER: '/pages/errand/form/deliver',
  HELP: '/pages/errand/form/help',
  CUSTOM: '/pages/errand/form/custom',
};

const TYPE_META: Record<string, { icon: string; gradient: string }> = {
  BUY: { icon: 'shopping-cart', gradient: 'linear-gradient(135deg, #FF7A45, #FFB020)' },
  DELIVER: { icon: 'truck', gradient: 'linear-gradient(135deg, #5B5FF8, #00B8D9)' },
  HELP: { icon: 'bell', gradient: 'linear-gradient(135deg, #11998E, #38EF7D)' },
  CUSTOM: { icon: 'sparkles', gradient: 'linear-gradient(135deg, #FA709A, #FEE140)' },
};

const decoratedTypes = computed(() =>
  types.value.map((t) => ({
    ...t,
    icon: TYPE_META[t.typeCode]?.icon ?? 'package',
    gradient: TYPE_META[t.typeCode]?.gradient ?? 'linear-gradient(135deg, #5B5FF8, #00B8D9)',
  })),
);

onMounted(async () => {
  const r = await listErrandTypes();
  if (r.code === '0' && r.data) {
    types.value = r.data.list;
  }
});

function goToForm(typeCode: string): void {
  uni.navigateTo({ url: FORM_PATH[typeCode] ?? '/pages/errand/form/custom' });
}
</script>

<template>
  <view class="home">
    <view class="home__hero">
      <text class="home__eyebrow">Errand Express</text>
      <text class="home__title">跑腿服务</text>
      <text class="home__subtitle">代买、代送、代办,一键发布需求</text>
    </view>

    <view class="home__section">
      <text class="home__section-title">选择服务类型</text>
      <view class="home__grid">
        <view v-for="t in decoratedTypes" :key="t.typeCode" class="home__card" @click="goToForm(t.typeCode)">
          <view class="home__card-icon" :style="{ background: t.gradient }">
            <SvgIcon :name="t.icon" :size="40" color="#fff" />
          </view>
          <text class="home__card-title">{{ t.name }}</text>
          <text class="home__card-desc">{{ t.description }}</text>
        </view>
      </view>
    </view>

    <FloatTabBar active="home" />
  </view>
</template>

<style scoped>
.home {
  min-height: 100vh;
  background: #fff;
  padding-bottom: 200rpx;
}

.home__hero {
  padding: 48rpx 32rpx 80rpx;
  background: linear-gradient(135deg, #5b5ff8 0%, #00b8d9 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.home__eyebrow {
  font-size: 22rpx;
  letter-spacing: 2rpx;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  align-self: flex-start;
}
.home__title {
  font-size: 56rpx;
  font-weight: 800;
  margin-top: 20rpx;
}
.home__subtitle {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.86);
}

.home__section {
  margin: 24rpx 24rpx 0;
}
.home__section:first-of-type {
  margin-top: -36rpx;
  padding: 32rpx 28rpx;
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.08);
}
.home__section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
  margin-bottom: 20rpx;
}

.home__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.home__card {
  padding: 28rpx 24rpx;
  background: #fff;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  align-items: flex-start;
}
.home__card-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 24rpx rgba(31, 41, 55, 0.12);
}
.home__card-emoji {
  font-size: 40rpx;
}
.home__card-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #172033;
}
.home__card-desc {
  font-size: 22rpx;
  color: #8a94a6;
  line-height: 1.4;
}
</style>
