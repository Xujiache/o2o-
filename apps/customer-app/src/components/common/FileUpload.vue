<script setup lang="ts">
/**
 * 文件上传组件:封装 uni.chooseImage / chooseMessageFile + 调用 /pub/files/upload。
 * 支持单图选择/进度回调/失败重试。
 */
import { ref } from 'vue';

import { uploadFile, type UploadResultVo } from '@/api';

const props = withDefaults(
  defineProps<{
    /** bizType 严格按后端 FileBizType 枚举,见 packages/contracts */
    bizType: string;
    /** 是否使用相机/相册;file = 任意文件(小程序仅 chooseMessageFile) */
    accept?: 'image' | 'file';
    buttonText?: string;
  }>(),
  { accept: 'image', buttonText: '选择并上传' },
);

const emit = defineEmits<{
  uploaded: [vo: UploadResultVo];
  error: [message: string];
}>();

const uploading = ref(false);
const progress = ref(0);
const lastError = ref('');

async function chooseAndUpload(): Promise<void> {
  uploading.value = true;
  progress.value = 0;
  lastError.value = '';

  try {
    let filePath: string | null = null;
    if (props.accept === 'image') {
      const res = await uni.chooseImage({ count: 1, sizeType: ['compressed'] });
      filePath = res.tempFilePaths?.[0] ?? null;
    } else {
      // #ifdef MP-WEIXIN
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = (await (uni as any).chooseMessageFile({ count: 1, type: 'file' })) as
        | { tempFiles?: Array<{ path: string }> }
        | undefined;
      filePath = r?.tempFiles?.[0]?.path ?? null;
      // #endif
      // #ifndef MP-WEIXIN
      const r2 = await uni.chooseImage({ count: 1 });
      filePath = r2.tempFilePaths?.[0] ?? null;
      // #endif
    }
    if (!filePath) {
      uploading.value = false;
      return;
    }

    const resp = await uploadFile(filePath, props.bizType);
    if (resp.code !== '0' || !resp.data) {
      lastError.value = resp.message || '上传失败';
      emit('error', lastError.value);
      return;
    }
    emit('uploaded', resp.data);
  } catch (e: unknown) {
    lastError.value = e instanceof Error ? e.message : String(e);
    emit('error', lastError.value);
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <view class="file-upload">
    <button class="file-upload__btn" :disabled="uploading" :loading="uploading" @click="chooseAndUpload">
      {{ uploading ? `上传中 ${progress}%` : buttonText }}
    </button>
    <view v-if="lastError" class="file-upload__error">
      <text>{{ lastError }}</text>
      <button size="mini" class="file-upload__retry" @click="chooseAndUpload">重试</button>
    </view>
  </view>
</template>

<style scoped>
.file-upload {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.file-upload__btn {
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
.file-upload__error {
  display: flex;
  align-items: center;
  gap: 16rpx;
  color: #d93025;
  font-size: 24rpx;
}
.file-upload__retry {
  background: #fff;
  color: #4c84ff;
  border: 1rpx solid #4c84ff;
}
</style>
