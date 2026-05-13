<script setup lang="ts">
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { createBatch } from '@/api/admin-trace';
import PageContainer from '@/components/PageContainer.vue';

const router = useRouter();
const formRef = ref<FormInstance | null>(null);
const submitting = ref(false);

interface BatchForm {
  productId: string;
  batchNo: string;
  totalCount: number;
  /** Element Plus DatePicker 直接给出 epoch ms(value-format='x') */
  producedAt: number | null;
  shelfLifeDays: number | null;
  supplierName: string;
}

const form = reactive<BatchForm>({
  productId: '',
  batchNo: '',
  totalCount: 100,
  producedAt: null,
  shelfLifeDays: null,
  supplierName: '',
});

const rules: FormRules<BatchForm> = {
  productId: [{ required: true, message: '请输入商品 ID', trigger: 'blur' }],
  batchNo: [
    { required: true, message: '请输入批次号', trigger: 'blur' },
    { max: 32, message: '批次号不超过 32 字符', trigger: 'blur' },
  ],
  totalCount: [
    { required: true, message: '请输入本批数量', trigger: 'blur' },
    {
      validator: (_r, v: number, cb): void => {
        if (!Number.isInteger(v) || v < 1 || v > 10000) cb(new Error('数量必须是 1-10000 之间的整数'));
        else cb();
      },
      trigger: 'blur',
    },
  ],
  producedAt: [{ required: true, message: '请选择生产日期', trigger: 'change' }],
};

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  const ok = await formRef.value.validate().catch(() => false);
  if (!ok) return;
  submitting.value = true;
  try {
    const r = await createBatch({
      productId: form.productId,
      batchNo: form.batchNo,
      totalCount: form.totalCount,
      producedAt: Number(form.producedAt),
      shelfLifeDays: form.shelfLifeDays ?? undefined,
      supplierName: form.supplierName || undefined,
    });
    if (r.code === '0' && r.data) {
      ElMessage.success('批次已创建');
      router.replace(`/admin/trace/batches/${r.data.traceBatchId}`);
    }
  } finally {
    submitting.value = false;
  }
}

function onCancel(): void {
  router.back();
}
</script>

<template>
  <PageContainer title="新建批次" subtitle="录入一批生鲜的溯源元数据,下一步生成二维码">
    <template #extra>
      <el-button @click="onCancel">返回</el-button>
    </template>

    <section class="card-surface form-panel">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        style="max-width: 720px"
        @submit.prevent="onSubmit"
      >
        <el-form-item label="商品 ID" prop="productId">
          <el-input v-model="form.productId" placeholder="grocery_product 表的 productId" />
        </el-form-item>
        <el-form-item label="批次号" prop="batchNo">
          <el-input v-model="form.batchNo" placeholder="例:BN-20260513-001" maxlength="32" show-word-limit />
        </el-form-item>
        <el-form-item label="本批数量" prop="totalCount">
          <el-input-number v-model="form.totalCount" :min="1" :max="10000" :step="10" />
          <span class="hint">将用于后续生成对应数量的二维码</span>
        </el-form-item>
        <el-form-item label="生产日期" prop="producedAt">
          <el-date-picker
            v-model="form.producedAt"
            type="date"
            placeholder="选择生产日期"
            value-format="x"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item label="保质期(天)">
          <el-input-number v-model="form.shelfLifeDays" :min="1" :max="3650" placeholder="选填" />
        </el-form-item>
        <el-form-item label="供应商">
          <el-input v-model="form.supplierName" placeholder="选填" maxlength="64" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="onSubmit">创建</el-button>
          <el-button @click="onCancel">取消</el-button>
        </el-form-item>
      </el-form>
    </section>
  </PageContainer>
</template>

<style scoped>
.form-panel {
  padding: var(--gap-4);
}
.hint {
  margin-left: 12px;
  color: var(--fg-muted);
  font-size: 12px;
}
</style>
