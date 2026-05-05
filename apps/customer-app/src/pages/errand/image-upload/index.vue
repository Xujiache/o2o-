<template>
  <view class="page">
    <text class="title">图片上传</text>
    <button @click="chooseImage">选择图片</button>
    <view v-if="files.length" class="files">
      <text v-for="(f, i) in files" :key="i" class="file">{{ f }}</text>
    </view>
    <view class="hint"> stage 6 简化:仅记录 fileId 占位,真上传走 stage 0 file 模块。 </view>
    <view class="actions">
      <button @click="done">完成</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const files = ref<string[]>([]);

function chooseImage(): void {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  uni.chooseImage?.({
    count: 9,
    success: (r: any) => {
      const paths: string[] = r.tempFilePaths ?? [];
      files.value = files.value.concat(paths);
    },
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

function done(): void {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const channel = (getCurrentPages?.() ?? []).slice(-1)[0]?.getOpenerEventChannel?.() as any;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (channel?.emit) {
    channel.emit('files:selected', { fileIds: files.value });
  }
  uni.navigateBack();
}
</script>

<style scoped>
.page {
  padding: 16px;
}
.title {
  font-size: 22px;
  font-weight: bold;
  display: block;
  margin-bottom: 12px;
}
.files {
  padding: 12px 0;
}
.file {
  display: block;
  font-size: 12px;
  color: #555;
  padding: 4px 0;
}
.hint {
  padding: 12px;
  background: #f5f5f5;
  border-radius: 6px;
  font-size: 13px;
  color: #888;
  margin-top: 12px;
}
.actions {
  margin-top: 24px;
}
</style>
