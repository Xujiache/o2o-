<template>
  <view class="page">
    <text class="title">自定义需求</text>
    <view class="field">
      <text class="label">需求描述 *</text>
      <textarea v-model="taskDesc" placeholder="描述您的具体需求..." class="textarea" />
    </view>
    <view class="field">
      <text class="label">预算(分)*</text>
      <input v-model.number="budget" type="number" placeholder="0" class="input" />
    </view>
    <view class="field">
      <text class="label">送达/办事地址(可选)</text>
      <input v-model="delivery" placeholder="可空" class="input" />
    </view>
    <view class="actions">
      <button :disabled="submitting" @click="submit">下一步:获取报价</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { useErrandFormStore } from '@/stores/errand-form';

const store = useErrandFormStore();
const taskDesc = ref('');
const budget = ref(0);
const delivery = ref('');
const submitting = ref(false);

function submit(): void {
  if (!taskDesc.value.trim() || budget.value <= 0) {
    uni.showToast({ title: '请填写所有必填项', icon: 'none' });
    return;
  }
  submitting.value = true;
  store.setDraft({
    typeCode: 'CUSTOM',
    deliveryAddress: { address: delivery.value || '由骑手与用户沟通' },
    urgentLevel: 'standard',
    taskDesc: taskDesc.value,
    budget: budget.value,
  });
  uni.navigateTo({ url: '/pages/errand/quote/index' });
  submitting.value = false;
}
</script>

<style scoped>
.page {
  padding: 20px;
}
.title {
  font-size: 22px;
  font-weight: bold;
  display: block;
  margin-bottom: 16px;
}
.field {
  margin-bottom: 16px;
}
.label {
  font-size: 14px;
  color: #555;
  display: block;
  margin-bottom: 4px;
}
.input,
.textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
}
.textarea {
  min-height: 80px;
}
.actions {
  margin-top: 24px;
}
</style>
