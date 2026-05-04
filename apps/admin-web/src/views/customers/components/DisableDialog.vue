<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';

import { changeCustomerStatus } from '@/api/admin-customers';

interface Props {
  modelValue: boolean;
  userId: string;
  operation: 'enable' | 'disable';
}
const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'submitted'): void;
}>();

const reason = ref('');
const submitting = ref(false);

watch(
  () => props.modelValue,
  (v) => {
    if (v) reason.value = '';
  },
);

async function onSubmit(): Promise<void> {
  if (!reason.value.trim()) {
    ElMessage.warning('请填写原因');
    return;
  }
  submitting.value = true;
  try {
    const r = await changeCustomerStatus(props.userId, {
      operation: props.operation,
      reason: reason.value.trim(),
    });
    if (r.code === '0') {
      ElMessage.success(props.operation === 'disable' ? '已禁用' : '已启用');
      emit('submitted');
      emit('update:modelValue', false);
    } else {
      ElMessage.error(r.message || '操作失败');
    }
  } finally {
    submitting.value = false;
  }
}

function onCancel(): void {
  emit('update:modelValue', false);
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="operation === 'disable' ? '禁用账号' : '启用账号'"
    width="480px"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
    @close="onCancel"
  >
    <el-form label-width="80px">
      <el-form-item label="操作原因" required>
        <el-input
          v-model="reason"
          type="textarea"
          :rows="3"
          placeholder="请填写操作原因(必填)"
          maxlength="255"
          show-word-limit
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="onCancel">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="onSubmit">确认</el-button>
    </template>
  </el-dialog>
</template>
