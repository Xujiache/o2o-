<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: string;
}
const props = defineProps<Props>();
const emit = defineEmits<{ (e: 'update:modelValue', val: string): void }>();

/** 18 位中国身份证号本地校验(校验位简化版) */
function checkIdCard(no: string): boolean {
  if (!/^\d{17}[\dXx]$/.test(no)) return false;
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checks = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += Number(no[i]) * weights[i]!;
  return checks[sum % 11]!.toUpperCase() === no[17]!.toUpperCase();
}

const valid = computed(() => !props.modelValue || checkIdCard(props.modelValue));

function onInput(e: Event & { detail?: { value?: string } }): void {
  const raw = String(e.detail?.value ?? (e.target as HTMLInputElement | null)?.value ?? '');
  const v = raw.replace(/[^\dXx]/g, '').slice(0, 18);
  emit('update:modelValue', v);
}
</script>

<template>
  <view class="id-card-input">
    <input
      class="id-card-input__field"
      type="text"
      maxlength="18"
      placeholder="身份证号(18 位)"
      :value="modelValue"
      @input="onInput"
    />
    <text v-if="modelValue && !valid" class="id-card-input__hint">身份证号格式错误</text>
  </view>
</template>

<style scoped>
.id-card-input {
  display: flex;
  align-items: center;
  border-bottom: 1rpx solid #ddd;
  padding: 24rpx 0;
}
.id-card-input__field {
  flex: 1;
  font-size: 32rpx;
  color: #333;
}
.id-card-input__hint {
  font-size: 22rpx;
  color: var(--price-color);
  margin-left: 16rpx;
}
</style>
