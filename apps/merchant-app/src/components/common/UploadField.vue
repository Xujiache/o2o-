<script setup lang="ts">
/** 单文件上传字段:点击触发 chooseImage → upload,成功后回写 fileId。 */
import { ref } from 'vue';

import { uploadFile } from '@/api';

interface Props {
  modelValue: string;
  label: string;
  bizType: string;
}
const props = defineProps<Props>();
const emit = defineEmits<{ (e: 'update:modelValue', val: string): void }>();

const uploading = ref(false);
const errorMsg = ref('');

async function onPick(): Promise<void> {
  errorMsg.value = '';
  try {
    const res = await new Promise<UniApp.ChooseImageSuccessCallbackResult>((resolve, reject) => {
      uni.chooseImage({ count: 1, success: resolve, fail: reject });
    });
    const path = res.tempFilePaths?.[0];
    if (!path) return;
    uploading.value = true;
    const r = await uploadFile(path, props.bizType);
    if (r.code !== '0' || !r.data) {
      errorMsg.value = r.message || '上传失败';
      return;
    }
    emit('update:modelValue', r.data.fileId);
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : '上传失败';
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <view class="upload-field">
    <view class="upload-field__row" @click="onPick">
      <text class="upload-field__label">{{ label }}</text>
      <text class="upload-field__status">
        {{ uploading ? '上传中...' : modelValue ? '已上传' : '点击上传' }}
      </text>
    </view>
    <text v-if="errorMsg" class="upload-field__error">{{ errorMsg }}</text>
  </view>
</template>

<style scoped>
.upload-field {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #eee;
}
.upload-field__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
}
.upload-field__label {
  font-size: 28rpx;
}
.upload-field__status {
  font-size: 24rpx;
  color: #4c84ff;
}
.upload-field__error {
  color: var(--price-color);
  font-size: 22rpx;
}
</style>
