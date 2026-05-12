<script setup lang="ts">
defineProps<{
  modelValue: boolean;
  title?: string;
  size?: string;
  loading?: boolean;
  confirmText?: string;
  cancelText?: string;
  hideFooter?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

function close(): void {
  emit('update:modelValue', false);
  emit('cancel');
}

function updateVisible(value: boolean): void {
  emit('update:modelValue', value);
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    :title="title"
    :size="size ?? '520px'"
    direction="rtl"
    :destroy-on-close="true"
    @update:model-value="updateVisible"
  >
    <div v-loading="loading" class="form-drawer__body">
      <slot />
    </div>
    <template v-if="!hideFooter" #footer>
      <div class="form-drawer__footer">
        <el-button @click="close">{{ cancelText ?? '取消' }}</el-button>
        <el-button type="primary" :loading="loading" @click="emit('confirm')">
          {{ confirmText ?? '确定' }}
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped>
.form-drawer__body {
  min-height: 200px;
}
.form-drawer__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--gap-2);
}
</style>
