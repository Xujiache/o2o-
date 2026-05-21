<script setup lang="ts">
import { ref } from 'vue';

import { useErrandFormStore } from '@/stores/errand-form';
import NavBar from '@/components/common/NavBar.vue';

const store = useErrandFormStore();
const taskDesc = ref('');
const budgetYuan = ref(0); // 用户输入元;后端用分
const delivery = ref('');
const submitting = ref(false);

function submit(): void {
  if (!taskDesc.value.trim() || budgetYuan.value <= 0) {
    uni.showToast({ title: '请填写所有必填项', icon: 'none' });
    return;
  }
  submitting.value = true;
  store.setDraft({
    typeCode: 'CUSTOM',
    deliveryAddress: { address: delivery.value || '由骑手与用户沟通' },
    urgentLevel: 'standard',
    taskDesc: taskDesc.value,
    budget: Math.round(budgetYuan.value * 100),
  });
  uni.navigateTo({ url: '/pages/errand/quote/index' });
  submitting.value = false;
}
</script>

<template>
  <view class="form">
    <NavBar title="自定义需求" />
    <view class="form__hero">
      <text class="form__eyebrow">自定义需求</text>
      <text class="form__title">描述你的具体需求</text>
      <text class="form__subtitle">不属于代买/代送/代办的事项可在此发布,骑手会主动联系沟通</text>
    </view>

    <view class="form__card">
      <view class="form__field">
        <view class="form__label"><text>需求描述</text><text class="form__required">*</text></view>
        <textarea v-model="taskDesc" placeholder="详细描述你的需求,越具体骑手越能精准报价..." class="form__textarea" />
      </view>
      <view class="form__field">
        <view class="form__label"><text>预算(元)</text><text class="form__required">*</text></view>
        <input v-model.number="budgetYuan" type="digit" placeholder="如:50" class="form__input" />
      </view>
      <view class="form__field form__field--last">
        <view class="form__label"><text>送达 / 办事地址(可选)</text></view>
        <input v-model="delivery" placeholder="留空则由骑手与你沟通" class="form__input" />
      </view>
    </view>

    <view class="form__bar">
      <button class="form__cta" :disabled="submitting" @click="submit">下一步:获取报价</button>
    </view>
  </view>
</template>

<style scoped>
.form {
  min-height: 100vh;
  padding: 0 0 200rpx;
  background: #fff;
}
.form__hero {
  position: relative;
  z-index: 1;
  padding: 40rpx 32rpx 56rpx;
  background: var(--brand-gradient);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.form__eyebrow {
  font-size: 22rpx;
  letter-spacing: 1rpx;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  align-self: flex-start;
}
.form__title {
  font-size: 40rpx;
  font-weight: 800;
  margin-top: 18rpx;
}
.form__subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.86);
  line-height: 1.5;
}
.form__card {
  position: relative;
  z-index: 2;
  margin: -28rpx 24rpx 0;
  padding: 8rpx 28rpx;
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.08);
}
.form__field {
  padding: 24rpx 0;
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.06);
}
.form__field--last {
  border-bottom: none;
}
.form__label {
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: var(--text-secondary);
  margin-bottom: 12rpx;
}
.form__required {
  color: var(--price-color);
  margin-left: 4rpx;
}
.form__input,
.form__textarea {
  width: 100%;
  min-height: 80rpx;
  padding: 20rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: var(--text-primary);
  box-sizing: border-box;
}
.form__textarea {
  min-height: 200rpx;
}
.form__bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 24rpx calc(env(safe-area-inset-bottom, 0rpx) + 24rpx);
  background: #fff;
  border-top: 1rpx solid rgba(31, 41, 55, 0.06);
  z-index: 50;
}
.form__cta {
  background: var(--brand-gradient);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: 999rpx;
  padding: 24rpx 0;
  box-shadow: 0 16rpx 40rpx rgba(46, 156, 93, 0.32);
}
.form__cta[disabled] {
  opacity: 0.5;
}
</style>
