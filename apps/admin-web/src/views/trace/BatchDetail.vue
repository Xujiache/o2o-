<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  downloadBatchCsv,
  generateQrcodes,
  getBatchDetail,
  getGenerateQrStatus,
  type GenerateQrcodesVo,
  type TraceBatchVo,
} from '@/api/admin-trace';
import PageContainer from '@/components/PageContainer.vue';
import StatCard from '@/components/StatCard.vue';
import StatusTag from '@/components/StatusTag.vue';
import { formatDate, formatDateTime } from '@/utils/format';

const route = useRoute();
const router = useRouter();
const batchId = computed<string>(() => String(route.query.id ?? route.params.id ?? ''));

const detail = ref<TraceBatchVo | null>(null);
const loading = ref(false);
const downloading = ref(false);

const genCount = ref(100);
const genTask = ref<GenerateQrcodesVo | null>(null);
const polling = ref(false);
let pollHandle: number | null = null;

const fmtDateTime = formatDateTime;
const fmtDate = formatDate;

const generatedCount = computed<number>(() => detail.value?.generatedCount ?? 0);
const remainingCount = computed<number>(() => Math.max((detail.value?.totalCount ?? 0) - generatedCount.value, 0));

const genProgressPercent = computed<number>(() => {
  if (!genTask.value || genTask.value.requested === 0) return 0;
  return Math.min(Math.round((genTask.value.progress / genTask.value.requested) * 100), 100);
});

const genStatusLabel: Record<GenerateQrcodesVo['status'], string> = {
  queued: '排队中',
  running: '生成中',
  done: '完成',
  failed: '失败',
};
const genStatusTone: Record<GenerateQrcodesVo['status'], 'info' | 'warning' | 'success' | 'danger'> = {
  queued: 'info',
  running: 'warning',
  done: 'success',
  failed: 'danger',
};

async function fetchDetail(): Promise<void> {
  if (!batchId.value) return;
  loading.value = true;
  try {
    const r = await getBatchDetail(batchId.value);
    if (r.code === '0' && r.data) detail.value = r.data;
  } finally {
    loading.value = false;
  }
}

function stopPolling(): void {
  if (pollHandle !== null) {
    window.clearInterval(pollHandle);
    pollHandle = null;
  }
  polling.value = false;
}

async function pollOnce(): Promise<void> {
  if (!genTask.value || !batchId.value) return;
  const r = await getGenerateQrStatus(batchId.value, genTask.value.taskId);
  if (r.code === '0' && r.data) {
    genTask.value = r.data;
    if (r.data.status === 'done' || r.data.status === 'failed') {
      stopPolling();
      if (r.data.status === 'done') {
        ElMessage.success(`已生成 ${r.data.progress} 个二维码`);
      } else {
        ElMessage.error(r.data.errorMessage || '生成失败');
      }
      void fetchDetail();
    }
  }
}

function startPolling(): void {
  stopPolling();
  polling.value = true;
  pollHandle = window.setInterval(() => {
    void pollOnce();
  }, 1500);
}

async function onGenerate(): Promise<void> {
  if (!batchId.value) return;
  if (!Number.isInteger(genCount.value) || genCount.value < 1) {
    ElMessage.warning('请输入正整数');
    return;
  }
  if (genCount.value > remainingCount.value && remainingCount.value > 0) {
    try {
      await ElMessageBox.confirm(
        `本批剩余可生成 ${remainingCount.value} 个,当前输入 ${genCount.value},是否继续?`,
        '确认',
        { confirmButtonText: '继续', cancelButtonText: '取消' },
      );
    } catch {
      return;
    }
  }
  const r = await generateQrcodes(batchId.value, { count: genCount.value });
  if (r.code === '0' && r.data) {
    genTask.value = r.data;
    ElMessage.success('任务已提交');
    if (r.data.status === 'done') {
      void fetchDetail();
    } else {
      startPolling();
    }
  }
}

async function onDownloadCsv(): Promise<void> {
  if (!batchId.value || !detail.value) return;
  downloading.value = true;
  try {
    await downloadBatchCsv(batchId.value, `trace-${detail.value.batchNo}.csv`);
    ElMessage.success('CSV 已开始下载');
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '下载失败');
  } finally {
    downloading.value = false;
  }
}

function batchStatusTone(status: number): 'success' | 'neutral' | 'danger' {
  if (status === 1) return 'success';
  if (status === 0) return 'neutral';
  return 'danger';
}
function batchStatusLabel(status: number): string {
  if (status === 1) return '正常';
  if (status === 0) return '草稿';
  return '作废';
}

function goRecords(): void {
  router.push(`/admin/trace/records/create?batchId=${batchId.value}`);
}
function goStats(): void {
  router.push(`/admin/trace/stats?batchId=${batchId.value}`);
}

onMounted(fetchDetail);
onUnmounted(stopPolling);
</script>

<template>
  <PageContainer title="批次详情" :subtitle="detail ? `批次号 ${detail.batchNo}` : ''">
    <template #extra>
      <el-button @click="router.back()">返回</el-button>
      <el-button @click="fetchDetail">刷新</el-button>
      <el-button type="primary" plain @click="goRecords">录入节点</el-button>
      <el-button type="primary" plain @click="goStats">扫码统计</el-button>
    </template>

    <section v-if="detail" v-loading="loading" class="card-surface detail-panel">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="批次 ID">
          <span class="mono">{{ detail.traceBatchId }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="批次号">
          <span class="mono">{{ detail.batchNo }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="商品 ID">
          <span class="mono">{{ detail.productId }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <StatusTag
            :status="String(detail.status)"
            :label="batchStatusLabel(detail.status)"
            :tone="batchStatusTone(detail.status)"
          />
        </el-descriptions-item>
        <el-descriptions-item label="生产日期">{{ fmtDate(detail.producedAt) }}</el-descriptions-item>
        <el-descriptions-item label="保质期">
          <span v-if="detail.shelfLifeDays != null">{{ detail.shelfLifeDays }} 天</span>
          <span v-else class="muted">—</span>
        </el-descriptions-item>
        <el-descriptions-item label="供应商">
          <span v-if="detail.supplierName">{{ detail.supplierName }}</span>
          <span v-else class="muted">—</span>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ fmtDateTime(detail.createdAt) }}</el-descriptions-item>
      </el-descriptions>
    </section>

    <section v-if="detail" class="stat-grid">
      <StatCard label="本批总量" :value="detail.totalCount" unit="个" tone="brand" />
      <StatCard label="已生成 QR" :value="generatedCount" unit="个" tone="success" />
      <StatCard label="剩余可生成" :value="remainingCount" unit="个" tone="warning" />
    </section>

    <section v-if="detail" class="card-surface qr-panel">
      <div class="panel-title">二维码批量生成</div>
      <div class="qr-form">
        <span class="muted">生成数量</span>
        <el-input-number v-model="genCount" :min="1" :max="10000" :step="50" />
        <el-button type="primary" :disabled="polling" :loading="polling" @click="onGenerate">提交生成任务</el-button>
        <el-button :loading="downloading" @click="onDownloadCsv">
          <el-icon><Download /></el-icon>
          <span style="margin-left: 6px">下载 CSV 索引</span>
        </el-button>
      </div>

      <div v-if="genTask" class="progress-block">
        <div class="progress-meta">
          <span
            >任务 <span class="mono">{{ genTask.taskId }}</span></span
          >
          <StatusTag
            :status="genTask.status"
            :label="genStatusLabel[genTask.status]"
            :tone="genStatusTone[genTask.status]"
          />
          <span class="muted">进度 {{ genTask.progress }} / {{ genTask.requested }}</span>
        </div>
        <el-progress
          :percentage="genProgressPercent"
          :status="genTask.status === 'failed' ? 'exception' : genTask.status === 'done' ? 'success' : undefined"
        />
        <div v-if="genTask.errorMessage" class="err">{{ genTask.errorMessage }}</div>
      </div>
    </section>
  </PageContainer>
</template>

<style scoped>
.detail-panel {
  padding: var(--gap-4);
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap-4);
}
.qr-panel {
  padding: var(--gap-4);
  display: flex;
  flex-direction: column;
  gap: var(--gap-3);
}
.panel-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--fg-primary);
}
.qr-form {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.progress-block {
  border-top: 1px solid var(--border-default);
  padding-top: var(--gap-3);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.progress-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
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
.err {
  color: var(--status-danger);
  font-size: 12px;
}
</style>
