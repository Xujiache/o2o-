<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { getStore, updateStoreSettings, type StoreVo } from '@/api';

const store = ref<StoreVo | null>(null);
const loading = ref(false);
const submitting = ref(false);
const errorMsg = ref('');
const okMsg = ref('');

const name = ref('');
const intro = ref('');
const minOrderAmount = ref(0);
const deliveryFee = ref(0);
const notice = ref('');

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await getStore();
    if (r.code === '0' && r.data) {
      store.value = r.data;
      name.value = r.data.name;
      intro.value = r.data.intro ?? '';
      minOrderAmount.value = Number(r.data.minOrderAmount);
      deliveryFee.value = Number(r.data.deliveryFee);
      notice.value = r.data.notice ?? '';
    }
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function onSubmit(): Promise<void> {
  errorMsg.value = '';
  okMsg.value = '';
  submitting.value = true;
  try {
    const r = await updateStoreSettings({
      name: name.value,
      intro: intro.value,
      minOrderAmount: minOrderAmount.value,
      deliveryFee: deliveryFee.value,
      notice: notice.value,
    });
    if (r.code !== '0') {
      errorMsg.value = r.message;
      return;
    }
    okMsg.value = '已保存';
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '保存失败';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="settings">
    <view class="settings__title">店铺设置</view>
    <view v-if="loading">加载中...</view>
    <view v-else-if="store" class="settings__form">
      <text class="settings__label">店铺名</text>
      <input class="settings__field" v-model="name" maxlength="128" />
      <text class="settings__label">简介</text>
      <input class="settings__field" v-model="intro" maxlength="500" />
      <text class="settings__label">起送价(分)</text>
      <input class="settings__field" type="number" v-model.number="minOrderAmount" />
      <text class="settings__label">配送费(分)</text>
      <input class="settings__field" type="number" v-model.number="deliveryFee" />
      <text class="settings__label">公告</text>
      <input class="settings__field" v-model="notice" maxlength="500" />

      <button class="settings__btn" :disabled="submitting" @click="onSubmit">
        {{ submitting ? '保存中...' : '保存' }}
      </button>
      <text v-if="okMsg" class="settings__ok">{{ okMsg }}</text>
      <text v-if="errorMsg" class="settings__error">{{ errorMsg }}</text>
    </view>
  </view>
</template>

<style scoped>
.settings {
  padding: 32rpx;
}
.settings__title {
  font-size: 36rpx;
  font-weight: 600;
}
.settings__form {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 24rpx;
}
.settings__label {
  font-size: 24rpx;
  color: #666;
  margin-top: 16rpx;
}
.settings__field {
  font-size: 28rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #ddd;
}
.settings__btn {
  margin-top: 48rpx;
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
.settings__ok {
  color: #52c41a;
  font-size: 26rpx;
}
.settings__error {
  color: #ff4d4f;
  font-size: 26rpx;
}
</style>
