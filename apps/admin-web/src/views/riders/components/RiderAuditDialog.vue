<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { ref, watch } from 'vue';

import { auditRider } from '@/api/admin-riders';

interface Props {
  modelValue: boolean;
  applicationId: string;
}
const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'submitted'): void;
}>();

const auditResult = ref<'approved' | 'rejected'>('approved');
const rejectReason = ref('');
const submitting = ref(false);

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      auditResult.value = 'approved';
      rejectReason.value = '';
    }
  },
);

async function onSubmit(): Promise<void> {
  if (auditResult.value === 'rejected' && !rejectReason.value.trim()) {
    ElMessage.warning('驳回必须填原因');
    return;
  }
  submitting.value = true;
  try {
    const r = await auditRider(props.applicationId, {
      auditResult: auditResult.value,
      rejectReason: auditResult.value === 'rejected' ? rejectReason.value.trim() : undefined,
    });
    if (r.code === '0') {
      ElMessage.success(auditResult.value === 'approved' ? '已通过' : '已驳回');
      emit('submitted');
      emit('update:modelValue', false);
    } else {
      ElMessage.error(r.message || '审核失败');
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="审核骑手申请"
    width="540px"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <el-form label-width="100px">
      <el-form-item label="审核结果">
        <el-radio-group v-model="auditResult">
          <el-radio value="approved">通过</el-radio>
          <el-radio value="rejected">驳回</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="auditResult === 'rejected'" label="驳回原因" required>
        <el-input v-model="rejectReason" type="textarea" :rows="3" maxlength="500" show-word-limit />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="onSubmit">提交</el-button>
    </template>
  </el-dialog>
</template>
