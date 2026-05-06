<script setup lang="ts">
interface Props {
  modelValue: string;
}
defineProps<Props>();
const emit = defineEmits<{ (e: 'update:modelValue', val: string): void }>();

function onInput(e: Event & { detail?: { value?: string } }): void {
  const raw = String(e.detail?.value ?? (e.target as HTMLInputElement | null)?.value ?? '');
  emit('update:modelValue', raw.replace(/\D/g, '').slice(0, 6));
}
</script>

<template>
  <view class="sms-code-input">
    <input
      class="sms-code-input__field"
      type="number"
      maxlength="6"
      placeholder="6 位短信验证码"
      :value="modelValue"
      @input="onInput"
    />
  </view>
</template>

<style scoped>
.sms-code-input {
  border-bottom: 1rpx solid #ddd;
  padding: 24rpx 0;
}
.sms-code-input__field {
  font-size: 32rpx;
  color: #333;
  letter-spacing: 8rpx;
}
</style>
