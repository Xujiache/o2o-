<script setup lang="ts">
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  createRecord,
  type CreateTraceRecordReq,
  TRACE_NODE_LABEL,
  type TraceAttachmentVo,
  type TraceNodeType,
} from '@/api/admin-trace';
import PageContainer from '@/components/PageContainer.vue';

const route = useRoute();
const router = useRouter();
const formRef = ref<FormInstance | null>(null);
const submitting = ref(false);

interface AttachmentRow {
  type: 'image' | 'pdf' | 'video' | 'file';
  fileId: string;
  url: string;
  name: string;
}

interface RecordForm {
  scope: 'batch' | 'qr';
  traceBatchId: string;
  traceQrId: string;
  nodeType: TraceNodeType;
  nodeTitle: string;
  content: string;
  happenedAt: number | null;
  attachments: AttachmentRow[];
}

const form = reactive<RecordForm>({
  scope: 'batch',
  traceBatchId: '',
  traceQrId: '',
  nodeType: 1,
  nodeTitle: '',
  content: '',
  happenedAt: Date.now(),
  attachments: [],
});

const rules: FormRules<RecordForm> = {
  traceBatchId: [{ required: true, message: '请输入批次 ID', trigger: 'blur' }],
  nodeType: [{ required: true, message: '请选择节点类型', trigger: 'change' }],
  nodeTitle: [
    { required: true, message: '请输入节点标题', trigger: 'blur' },
    { max: 64, message: '标题不超过 64 字符', trigger: 'blur' },
  ],
  happenedAt: [{ required: true, message: '请选择发生时间', trigger: 'change' }],
};

const NODE_OPTIONS: { value: TraceNodeType; label: string }[] = (Object.keys(TRACE_NODE_LABEL) as unknown as string[])
  .map((k) => Number(k) as TraceNodeType)
  .map((v) => ({ value: v, label: `${v} ${TRACE_NODE_LABEL[v]}` }));

function addAttachment(): void {
  form.attachments.push({ type: 'image', fileId: '', url: '', name: '' });
}
function removeAttachment(idx: number): void {
  form.attachments.splice(idx, 1);
}

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  const ok = await formRef.value.validate().catch(() => false);
  if (!ok) return;
  if (form.scope === 'qr' && !form.traceQrId.trim()) {
    ElMessage.warning('QR 维度需要填写 QR ID');
    return;
  }
  const validAttachments: TraceAttachmentVo[] = form.attachments
    .filter((a) => a.fileId.trim())
    .map((a) => ({
      type: a.type,
      fileId: a.fileId.trim(),
      url: a.url.trim() || undefined,
      name: a.name.trim() || undefined,
    }));

  submitting.value = true;
  try {
    const body: CreateTraceRecordReq = {
      traceBatchId: form.traceBatchId.trim(),
      traceQrId: form.scope === 'qr' ? form.traceQrId.trim() : undefined,
      nodeType: form.nodeType,
      nodeTitle: form.nodeTitle.trim(),
      content: form.content.trim() || undefined,
      attachments: validAttachments.length ? validAttachments : undefined,
      happenedAt: Number(form.happenedAt),
    };
    const r = await createRecord(body);
    if (r.code === '0' && r.data) {
      ElMessage.success('节点已录入');
      if (form.scope === 'qr' && form.traceQrId) {
        router.replace(`/admin/trace/qrcodes/${form.traceQrId}`);
      } else {
        router.replace(`/admin/trace/batches/${form.traceBatchId}`);
      }
    }
  } finally {
    submitting.value = false;
  }
}

function onCancel(): void {
  router.back();
}

onMounted(() => {
  const qBatch = route.query.batchId;
  const qQr = route.query.qrId;
  if (typeof qBatch === 'string' && qBatch) form.traceBatchId = qBatch;
  if (typeof qQr === 'string' && qQr) {
    form.traceQrId = qQr;
    form.scope = 'qr';
  }
});
</script>

<template>
  <PageContainer title="节点录入" subtitle="新增溯源节点 · 批次维度或单 QR 维度">
    <template #extra>
      <el-button @click="onCancel">返回</el-button>
    </template>

    <section class="card-surface form-panel">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        style="max-width: 760px"
        @submit.prevent="onSubmit"
      >
        <el-form-item label="作用范围" required>
          <el-radio-group v-model="form.scope">
            <el-radio value="batch">批次维度(整批共享)</el-radio>
            <el-radio value="qr">QR 维度(单瓶专属)</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="批次 ID" prop="traceBatchId">
          <el-input v-model="form.traceBatchId" placeholder="traceBatchId" />
        </el-form-item>

        <el-form-item v-if="form.scope === 'qr'" label="QR ID" prop="traceQrId">
          <el-input v-model="form.traceQrId" placeholder="traceQrId" />
        </el-form-item>

        <el-form-item label="节点类型" prop="nodeType">
          <el-select v-model="form.nodeType" style="width: 240px">
            <el-option v-for="opt in NODE_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>

        <el-form-item label="节点标题" prop="nodeTitle">
          <el-input v-model="form.nodeTitle" placeholder="例:产地直采 · 农户张三" maxlength="64" show-word-limit />
        </el-form-item>

        <el-form-item label="详情" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="3"
            placeholder="选填"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="发生时间" prop="happenedAt">
          <el-date-picker
            v-model="form.happenedAt"
            type="datetime"
            placeholder="选择时间"
            value-format="x"
            style="width: 240px"
          />
        </el-form-item>

        <el-form-item label="附件">
          <div class="attachments">
            <div v-for="(att, idx) in form.attachments" :key="idx" class="attachment-row">
              <el-select v-model="att.type" style="width: 110px">
                <el-option label="图片" value="image" />
                <el-option label="PDF" value="pdf" />
                <el-option label="视频" value="video" />
                <el-option label="文件" value="file" />
              </el-select>
              <el-input v-model="att.fileId" placeholder="fileId(来自上传接口)" style="width: 260px" />
              <el-input v-model="att.name" placeholder="显示名(选填)" style="width: 180px" />
              <el-input v-model="att.url" placeholder="预览 URL(选填)" style="width: 240px" />
              <el-button link type="danger" @click="removeAttachment(idx)">移除</el-button>
            </div>
            <el-button link type="primary" @click="addAttachment">+ 添加附件</el-button>
            <p class="muted">附件 fileId 由后端文件上传接口返回,目前手工填入;最多 20 个。</p>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="onSubmit">提交</el-button>
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
.attachments {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.attachment-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.muted {
  color: var(--fg-muted);
  font-size: 12px;
  margin: 0;
}
</style>
