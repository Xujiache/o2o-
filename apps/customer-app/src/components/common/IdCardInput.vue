<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: string;
}
const props = defineProps<Props>();
const emit = defineEmits<{ (e: 'update:modelValue', val: string): void }>();

const valid = computed(() => isValidIdCard(props.modelValue));

function onInput(e: Event): void {
  const target = e.target as HTMLInputElement;
  // 18 位身份证最后一位可能为 X
  emit(
    'update:modelValue',
    target.value
      .replace(/[^0-9Xx]/g, '')
      .slice(0, 18)
      .toUpperCase(),
  );
}

/** 18 位身份证校验位本地校验(GB/T 11643-1999) */
function isValidIdCard(id: string): boolean {
  if (!/^\d{17}[\dX]$/.test(id)) return false;
  const w = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checks = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += Number(id[i]) * w[i]!;
  }
  return checks[sum % 11] === id[17];
}
</script>

<template>
  <view class="id-card-input">
    <input
      class="id-card-input__field"
      type="text"
      maxlength="18"
      placeholder="请输入 18 位身份证号"
      :value="modelValue"
      @input="onInput"
    />
    <text v-if="modelValue && !valid" class="id-card-input__hint">身份证号格式错误</text>
  </view>
</template>

<style scoped>
.id-card-input {
  border-bottom: 1rpx solid #ddd;
  padding: 24rpx 0;
}
.id-card-input__field {
  font-size: 32rpx;
  color: #333;
}
.id-card-input__hint {
  font-size: 22rpx;
  color: #ff4d4f;
  margin-top: 8rpx;
  display: block;
}
</style>
