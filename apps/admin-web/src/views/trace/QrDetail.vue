<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  deleteRecord,
  getQrDetail,
  type QrDetailVo,
  TRACE_NODE_LABEL,
  type TraceNodeType,
  type TraceRecordVo,
} from '@/api/admin-trace';
import PageContainer from '@/components/PageContainer.vue';
import { useUserStore } from '@/stores/user';
import { formatDateTime } from '@/utils/format';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const fmtDateTime = formatDateTime;

const qrId = computed<string>(() => String(route.params.qrId ?? route.query.qrId ?? ''));
const detail = ref<QrDetailVo | null>(null);
const loading = ref(false);

const qrRecords = computed<TraceRecordVo[]>(() =>
  (detail.value?.records ?? [])
    .filter((r) => r.traceQrId === detail.value?.traceQrId)
    .slice()
    .sort((a, b) => a.happenedAt - b.happenedAt),
);
const batchRecords = computed<TraceRecordVo[]>(() =>
  (detail.value?.records ?? [])
    .filter((r) => !r.traceQrId)
    .slice()
    .sort((a, b) => a.happenedAt - b.happenedAt),
);

function nodeLabel(t: number): string {
  return TRACE_NODE_LABEL[t as TraceNodeType] ?? `节点 ${t}`;
}

async function fetchDetail(): Promise<void> {
  if (!qrId.value) return;
  loading.value = true;
  try {
    const r = await getQrDetail(qrId.value);
    if (r.code === '0' && r.data) detail.value = r.data;
  } finally {
    loading.value = false;
  }
}

function goAddRecord(): void {
  if (!detail.value) return;
  router.push(`/admin/trace/records/create?batchId=${detail.value.traceBatchId}&qrId=${detail.value.traceQrId}`);
}

function goBatch(): void {
  if (!detail.value) return;
  router.push(`/admin/trace/batches/${detail.value.traceBatchId}`);
}

async function onDeleteRecord(row: TraceRecordVo): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除节点「${row.nodeTitle}」?`, '删除节点', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  const r = await deleteRecord(row.traceRecordId);
  if (r.code === '0') {
    ElMessage.success('已删除');
    void fetchDetail();
  }
}

onMounted(fetchDetail);
</script>

<template>
  <PageContainer
    :title="detail ? `QR ${detail.qrCode}` : 'QR 详情'"
    :subtitle="detail ? `批次 ${detail.batchNo} · 序号 ${detail.serialNo}` : ''"
  >
    <template #extra>
      <el-button @click="router.back()">返回</el-button>
      <el-button @click="fetchDetail">刷新</el-button>
      <el-button v-if="detail" @click="goBatch">批次详情</el-button>
      <el-button v-if="detail && userStore.has('admin:menu:trace')" type="primary" @click="goAddRecord"
        >新增节点</el-button
      >
    </template>

    <section v-if="detail" v-loading="loading" class="card-surface info-panel">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="QR ID">
          <span class="mono">{{ detail.traceQrId }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="QR 码">
          <span class="mono">{{ detail.qrCode }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="批次号">
          <span class="mono">{{ detail.batchNo }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="商品">{{ detail.productName }}</el-descriptions-item>
        <el-descriptions-item label="序号">{{ detail.serialNo }}</el-descriptions-item>
        <el-descriptions-item label="扫码数">{{ detail.scanCount }}</el-descriptions-item>
        <el-descriptions-item label="首次扫码">
          <span v-if="detail.firstScanAt">{{ fmtDateTime(detail.firstScanAt) }}</span>
          <span v-else class="muted">—</span>
        </el-descriptions-item>
        <el-descriptions-item label="状态">{{ detail.status }}</el-descriptions-item>
      </el-descriptions>
    </section>

    <section v-if="detail" class="card-surface timeline-panel">
      <div class="panel-header">
        <span class="panel-title">本 QR 专属节点</span>
        <span class="muted">共 {{ qrRecords.length }} 条 · 突出显示</span>
      </div>
      <el-timeline v-if="qrRecords.length">
        <el-timeline-item
          v-for="r in qrRecords"
          :key="r.traceRecordId"
          :timestamp="fmtDateTime(r.happenedAt)"
          placement="top"
          type="primary"
        >
          <div class="record-card record-card--qr">
            <div class="record-head">
              <el-tag type="primary" size="small">{{ nodeLabel(r.nodeType) }}</el-tag>
              <span class="record-title">{{ r.nodeTitle }}</span>
              <div class="record-actions">
                <el-button
                  v-if="userStore.has('admin:menu:trace')"
                  link
                  type="danger"
                  size="small"
                  @click="onDeleteRecord(r)"
                  >删除</el-button
                >
              </div>
            </div>
            <div v-if="r.content" class="record-content">{{ r.content }}</div>
            <div v-if="r.attachments && r.attachments.length" class="record-files">
              附件:
              <span v-for="a in r.attachments" :key="a.fileId" class="file-pill">
                {{ a.name || a.fileId }}
              </span>
            </div>
            <div class="record-meta muted">
              <span v-if="r.operatorName">操作员 {{ r.operatorName }}</span>
              <span>创建 {{ fmtDateTime(r.createdAt) }}</span>
            </div>
          </div>
        </el-timeline-item>
      </el-timeline>
      <div v-else class="empty">暂无 QR 专属节点</div>
    </section>

    <section v-if="detail" class="card-surface timeline-panel">
      <div class="panel-header">
        <span class="panel-title">批次维度节点(只读)</span>
        <span class="muted">共 {{ batchRecords.length }} 条 · 整批共享</span>
      </div>
      <el-timeline v-if="batchRecords.length">
        <el-timeline-item
          v-for="r in batchRecords"
          :key="r.traceRecordId"
          :timestamp="fmtDateTime(r.happenedAt)"
          placement="top"
          color="#94a3b8"
        >
          <div class="record-card record-card--batch">
            <div class="record-head">
              <el-tag type="info" size="small">{{ nodeLabel(r.nodeType) }}</el-tag>
              <span class="record-title">{{ r.nodeTitle }}</span>
            </div>
            <div v-if="r.content" class="record-content">{{ r.content }}</div>
            <div v-if="r.attachments && r.attachments.length" class="record-files">
              附件:
              <span v-for="a in r.attachments" :key="a.fileId" class="file-pill">
                {{ a.name || a.fileId }}
              </span>
            </div>
            <div class="record-meta muted">
              <span v-if="r.operatorName">操作员 {{ r.operatorName }}</span>
              <span>创建 {{ fmtDateTime(r.createdAt) }}</span>
            </div>
          </div>
        </el-timeline-item>
      </el-timeline>
      <div v-else class="empty">暂无批次维度节点</div>
    </section>
  </PageContainer>
</template>

<style scoped>
.info-panel {
  padding: var(--gap-4);
}
.timeline-panel {
  padding: var(--gap-4);
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--gap-3);
}
.panel-title {
  font-weight: 600;
  font-size: 14px;
}
.record-card {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 12px 14px;
  background: var(--bg-canvas);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.record-card--qr {
  background: rgba(59, 130, 246, 0.06);
  border-color: rgba(59, 130, 246, 0.32);
}
.record-card--batch {
  opacity: 0.85;
}
.record-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.record-title {
  font-weight: 600;
  flex: 1;
}
.record-actions {
  display: flex;
  gap: 6px;
}
.record-content {
  font-size: 13px;
  color: var(--fg-secondary);
  white-space: pre-wrap;
}
.record-files {
  font-size: 12px;
  color: var(--fg-secondary);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.file-pill {
  padding: 2px 8px;
  background: rgba(59, 130, 246, 0.12);
  color: var(--brand-500, #3b82f6);
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 11px;
}
.record-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
}
.empty {
  text-align: center;
  color: var(--fg-muted);
  padding: 24px 0;
  font-size: 13px;
}
.mono {
  font-family: var(--font-mono);
  font-size: 12px;
}
.muted {
  color: var(--fg-muted);
  font-size: 12px;
}
</style>
