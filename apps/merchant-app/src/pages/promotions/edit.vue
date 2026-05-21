<script setup lang="ts">
import { computed, ref } from 'vue';

import { createPromotion } from '@/api';

const promoType = ref<'time_limited' | 'single_full_off'>('time_limited');
const name = ref('');
const productIdsText = ref('');
const startTime = ref(new Date(Date.now() + 60_000).toISOString().slice(0, 16));
const endTime = ref(new Date(Date.now() + 24 * 60 * 60_000).toISOString().slice(0, 16));
const discountValue = ref(80);
const fullAmount = ref(5000);
const offAmount = ref(500);
const errorMsg = ref('');
const okMsg = ref('');
const submitting = ref(false);

const productIds = computed(() =>
  productIdsText.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

const canSubmit = computed(() => name.value && productIds.value.length > 0 && !submitting.value);

async function onSubmit(): Promise<void> {
  errorMsg.value = '';
  okMsg.value = '';
  submitting.value = true;
  try {
    const rules =
      promoType.value === 'time_limited'
        ? { discountType: 'percent', discountValue: discountValue.value }
        : { tiers: [{ minAmount: fullAmount.value, offAmount: offAmount.value }] };
    const r = await createPromotion({
      promoType: promoType.value,
      name: name.value,
      productIds: productIds.value,
      rules,
      startTime: new Date(startTime.value).getTime(),
      endTime: new Date(endTime.value).getTime(),
    });
    if (r.code !== '0') {
      errorMsg.value = r.message;
      return;
    }
    okMsg.value = `已创建活动 ${r.data?.promoId}`;
    setTimeout(() => uni.navigateBack(), 1000);
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '保存失败';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="pe">
    <view class="pe__title">新建促销活动</view>

    <text class="pe__label">类型</text>
    <view class="pe__radio-row">
      <text class="pe__radio" :class="{ active: promoType === 'time_limited' }" @click="promoType = 'time_limited'"
        >限时折扣</text
      >
      <text
        class="pe__radio"
        :class="{ active: promoType === 'single_full_off' }"
        @click="promoType = 'single_full_off'"
        >单品满减</text
      >
    </view>

    <text class="pe__label">活动名</text>
    <input class="pe__field" v-model="name" maxlength="128" />

    <text class="pe__label">商品 ID 列表(逗号分隔)</text>
    <input class="pe__field" v-model="productIdsText" placeholder="100,200,300" />

    <text class="pe__label">开始时间</text>
    <input class="pe__field" type="datetime-local" v-model="startTime" />
    <text class="pe__label">结束时间</text>
    <input class="pe__field" type="datetime-local" v-model="endTime" />

    <template v-if="promoType === 'time_limited'">
      <text class="pe__label">折扣率(80 = 八折,付原价 80%)</text>
      <input class="pe__field" type="number" v-model.number="discountValue" />
    </template>
    <template v-else>
      <text class="pe__label">满 N 分</text>
      <input class="pe__field" type="number" v-model.number="fullAmount" />
      <text class="pe__label">立减 N 分</text>
      <input class="pe__field" type="number" v-model.number="offAmount" />
    </template>

    <button class="pe__submit" :disabled="!canSubmit" @click="onSubmit">
      {{ submitting ? '保存中...' : '保存' }}
    </button>
    <text v-if="okMsg" class="pe__ok">{{ okMsg }}</text>
    <text v-if="errorMsg" class="pe__error">{{ errorMsg }}</text>
  </view>
</template>

<style scoped>
.pe {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.pe__title {
  font-size: 36rpx;
  font-weight: 600;
}
.pe__label {
  font-size: 24rpx;
  color: #666;
  margin-top: 16rpx;
}
.pe__field {
  font-size: 28rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #ddd;
}
.pe__radio-row {
  display: flex;
  gap: 16rpx;
  margin-top: 12rpx;
}
.pe__radio {
  padding: 12rpx 24rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 24rpx;
}
.pe__radio.active {
  background: #4c84ff;
  color: #fff;
}
.pe__submit {
  margin-top: 48rpx;
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
.pe__ok {
  color: #52c41a;
}
.pe__error {
  color: var(--price-color);
}
</style>
