<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';

import { arbitrate, type ArbitrateDecision, type ArbitrateResponsibleParty } from '@/api/admin-after-sales';

interface Props {
  modelValue: boolean;
  afterSaleId: string;
  /** 默认退款金额（分,字符串）;来自 after_sale.amountCents */
  defaultRefundAmount?: string;
}
const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'submitted'): void;
}>();

const decision = ref<ArbitrateDecision>('APPROVE');
const responsibleParty = ref<ArbitrateResponsibleParty>('MERCHANT');
const refundAmountYuan = ref<number>(0);
const penaltyYuan = ref<number>(0);
const remark = ref('');
const submitting = ref(false);

function yuanToCents(yuan: number): string {
  // 用整数运算避免浮点漂移
  const cents = Math.round(yuan * 100);
  return String(cents);
}

function centsToYuan(cents: string | undefined): number {
  if (!cents) return 0;
  const n = Number(cents);
  if (!Number.isFinite(n)) return 0;
  return n / 100;
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      decision.value = 'APPROVE';
      responsibleParty.value = 'MERCHANT';
      refundAmountYuan.value = centsToYuan(props.defaultRefundAmount);
      penaltyYuan.value = 0;
      remark.value = '';
    }
  },
);

async function onSubmit(): Promise<void> {
  if (!remark.value.trim()) {
    ElMessage.warning('请填写仲裁说明');
    return;
  }
  if (decision.value !== 'REJECT' && refundAmountYuan.value <= 0) {
    ElMessage.warning('批准/部分退款时退款金额必须大于 0');
    return;
  }
  if (refundAmountYuan.value < 0 || penaltyYuan.value < 0) {
    ElMessage.warning('金额不能为负');
    return;
  }
  submitting.value = true;
  try {
    const r = await arbitrate(props.afterSaleId, {
      responsibleParty: responsibleParty.value,
      decision: decision.value,
      refundAmount: decision.value === 'REJECT' ? '0' : yuanToCents(refundAmountYuan.value),
      penalty: yuanToCents(penaltyYuan.value),
      remark: remark.value.trim(),
    });
    if (r.code === '0') {
      ElMessage.success('仲裁已提交');
      emit('submitted');
      emit('update:modelValue', false);
    }
    // 失败的 toast 由 request 拦截器统一弹出
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="平台仲裁"
    width="560px"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <el-form label-width="110px">
      <el-form-item label="仲裁决定">
        <el-radio-group v-model="decision">
          <el-radio value="APPROVE">批准退款</el-radio>
          <el-radio value="PARTIAL">部分退款</el-radio>
          <el-radio value="REJECT">驳回</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="责任方">
        <el-radio-group v-model="responsibleParty">
          <el-radio value="MERCHANT">商家</el-radio>
          <el-radio value="RIDER">骑手</el-radio>
          <el-radio value="CUSTOMER">用户</el-radio>
          <el-radio value="PLATFORM">平台</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="decision !== 'REJECT'" label="退款金额(元)" required>
        <el-input-number v-model="refundAmountYuan" :min="0" :step="1" :precision="2" />
      </el-form-item>
      <el-form-item label="罚款金额(元)">
        <el-input-number v-model="penaltyYuan" :min="0" :step="1" :precision="2" />
        <span style="margin-left: 8px; color: #888">向责任方扣罚,可为 0</span>
      </el-form-item>
      <el-form-item label="仲裁说明" required>
        <el-input
          v-model="remark"
          type="textarea"
          :rows="3"
          maxlength="500"
          show-word-limit
          placeholder="请填写仲裁理由(必填)"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="onSubmit">提交仲裁</el-button>
    </template>
  </el-dialog>
</template>
