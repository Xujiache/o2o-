<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { nextTick, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { lookupQr, type QrLookupVo } from '@/api/admin-trace';
import PageContainer from '@/components/PageContainer.vue';
import { formatDateTime } from '@/utils/format';

const router = useRouter();
const inputRef = ref<HTMLInputElement | null>(null);
const code = ref('');
const looking = ref(false);
const fmtDateTime = formatDateTime;

interface HistoryItem {
  code: string;
  qrId: string;
  batchNo: string;
  productName: string;
  serialNo: number;
  scanCount: number;
  at: number;
}

const history = ref<HistoryItem[]>([]);

function focusInput(): void {
  void nextTick(() => {
    inputRef.value?.focus();
  });
}

async function onSubmit(): Promise<void> {
  const v = code.value.trim();
  if (!v) {
    focusInput();
    return;
  }
  looking.value = true;
  try {
    const r = await lookupQr(v);
    if (r.code === '0' && r.data) {
      const item: HistoryItem = {
        code: r.data.qrCode,
        qrId: r.data.traceQrId,
        batchNo: r.data.batchNo,
        productName: r.data.productName,
        serialNo: r.data.serialNo,
        scanCount: r.data.scanCount,
        at: Date.now(),
      };
      // 去重前 10 条
      history.value = [item, ...history.value.filter((h) => h.qrId !== item.qrId)].slice(0, 10);
      // 清空输入,聚焦准备下一次扫码
      code.value = '';
      focusInput();
      // 自动跳详情
      router.push(`/admin/trace/qrcodes/${item.qrId}`);
    } else {
      // 业务错误,清空输入聚焦
      code.value = '';
      focusInput();
    }
  } catch {
    ElMessage.error('查询失败');
    code.value = '';
    focusInput();
  } finally {
    looking.value = false;
  }
}

function goDetail(item: HistoryItem): void {
  router.push(`/admin/trace/qrcodes/${item.qrId}`);
}

function clearHistory(): void {
  history.value = [];
}

function previewLookup(item: QrLookupVo | HistoryItem): void {
  // 仅供 history row 跳详情时的 fallback,不在 template 使用
  router.push(`/admin/trace/qrcodes/${'qrId' in item ? item.qrId : item.traceQrId}`);
}
void previewLookup; // 防止 unused 警告

onMounted(() => {
  focusInput();
});
</script>

<template>
  <PageContainer title="二维码定位" subtitle="扫码枪输入 + 自动跳详情 · 最近 10 条历史">
    <section class="card-surface scan-panel">
      <div class="scan-row">
        <label class="scan-label">扫描或输入 QR 码</label>
        <input
          ref="inputRef"
          v-model="code"
          class="scan-input"
          placeholder="qr_code,扫码枪自动回车"
          autocomplete="off"
          @keyup.enter="onSubmit"
        />
        <el-button type="primary" :loading="looking" @click="onSubmit">查询</el-button>
      </div>
      <p class="muted">说明:输入框已自动聚焦,扫码枪扫描后按回车自动提交并跳转详情。</p>
    </section>

    <section class="card-surface history-panel">
      <div class="panel-header">
        <span class="panel-title">最近扫描历史</span>
        <el-button v-if="history.length" link type="primary" @click="clearHistory">清空</el-button>
      </div>
      <el-table v-if="history.length" :data="history" stripe>
        <el-table-column label="QR 码" prop="code" min-width="220">
          <template #default="{ row }"
            ><span class="mono">{{ row.code }}</span></template
          >
        </el-table-column>
        <el-table-column label="批次号" prop="batchNo" width="140">
          <template #default="{ row }"
            ><span class="mono">{{ row.batchNo }}</span></template
          >
        </el-table-column>
        <el-table-column label="商品" prop="productName" min-width="160" show-overflow-tooltip />
        <el-table-column label="序号" prop="serialNo" width="90" align="right" />
        <el-table-column label="扫码数" prop="scanCount" width="90" align="right" />
        <el-table-column label="查询时间" width="180">
          <template #default="{ row }"
            ><span class="muted">{{ fmtDateTime(row.at) }}</span></template
          >
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="goDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-else class="empty">暂无记录,扫一个试试</div>
    </section>
  </PageContainer>
</template>

<style scoped>
.scan-panel {
  padding: var(--gap-4);
  display: flex;
  flex-direction: column;
  gap: var(--gap-2);
}
.scan-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.scan-label {
  font-size: 13px;
  color: var(--fg-secondary);
  white-space: nowrap;
}
.scan-input {
  flex: 1;
  height: 40px;
  padding: 0 14px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-canvas);
  color: var(--fg-primary);
  font-family: var(--font-mono);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.scan-input:focus {
  border-color: var(--brand-500, #3b82f6);
}
.history-panel {
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
.empty {
  text-align: center;
  color: var(--fg-muted);
  padding: 32px 0;
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
