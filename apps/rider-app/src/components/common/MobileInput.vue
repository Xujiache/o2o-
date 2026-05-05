<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: string;
}
const props = defineProps<Props>();
const emit = defineEmits<{ (e: 'update:modelValue', val: string): void }>();

const valid = computed(() => /^1[3-9]\d{9}$/.test(props.modelValue));

function onInput(e: Event): void {
  const target = e.target as HTMLInputElement;
  emit('update:modelValue', target.value.replace(/\D/g, '').slice(0, 11));
}
</script>

<template>
  <view class="mobile-input">
    <text class="mobile-input__prefix">+86</text>
    <input
      class="mobile-input__field"
      type="number"
      maxlength="11"
      placeholder="骑手手机号"
      :value="modelValue"
      @input="onInput"
    />
    <text v-if="modelValue && !valid" class="mobile-input__hint">手机号格式错误</text>
  </view>
</template>

<style scoped>
.mobile-input {
  display: flex;
  align-items: center;
  border-bottom: 1rpx solid #ddd;
  padding: 24rpx 0;
}
.mobile-input__prefix {
  color: #333;
  font-size: 32rpx;
  margin-right: 24rpx;
}
.mobile-input__field {
  flex: 1;
  font-size: 32rpx;
  color: #333;
}
.mobile-input__hint {
  font-size: 22rpx;
  color: #ff4d4f;
  margin-left: 16rpx;
}
</style>
