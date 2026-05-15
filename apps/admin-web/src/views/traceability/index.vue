<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';

import {
  type ArchiveVo,
  type BatchVo,
  type QrcodeVo,
  bindQrcodeToArchive,
  createArchive,
  generateBatch,
  listArchives,
  listBatchCodes,
  listBatches,
} from '@/api/admin-traceability';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const canWrite = (): boolean => userStore.has('admin:trace:archive:write');
const canGen = (): boolean => userStore.has('admin:trace:qrcode:generate');
const canBind = (): boolean => userStore.has('admin:trace:qrcode:bind');

const activeTab = ref<'archives' | 'batches' | 'bind'>('archives');

const archives = ref<ArchiveVo[]>([]);
const archivesLoading = ref(false);
const archiveQuery = reactive({ keyword: '', pageNo: 1, pageSize: 20 });
const archivesTotal = ref(0);

const archiveDialog = ref(false);
const archiveForm = reactive({
  batchNo: '',
  farmName: '',
  farmAddress: '',
  breedDate: '' as string | '',
  slaughterDate: '' as string | '',
  weightGrams: 0,
  quarantineCertNo: '',
  veterinarian: '',
  feedType: '',
  remark: '',
});

const batches = ref<BatchVo[]>([]);
const batchesLoading = ref(false);
const batchesTotal = ref(0);
const batchesQuery = reactive({ pageNo: 1, pageSize: 20 });
const genDialog = ref(false);
const genForm = reactive({ name: '', count: 100 });
const lastGen = ref<{ batchId: string; codes: string[] } | null>(null);

const codesDialog = ref(false);
const codesData = ref<{ batchId: string; name: string; codes: QrcodeVo[] } | null>(null);

const bindDialog = ref(false);
const bindCode = ref('');
const bindArchiveId = ref('');

async function fetchArchives(): Promise<void> {
  archivesLoading.value = true;
  try {
    const r = await listArchives({
      keyword: archiveQuery.keyword || undefined,
      pageNo: archiveQuery.pageNo,
      pageSize: archiveQuery.pageSize,
    });
    if (r.code === '0' && r.data) {
      archives.value = r.data.list;
      archivesTotal.value = r.data.total;
    }
  } finally {
    archivesLoading.value = false;
  }
}

function openCreateArchive(): void {
  Object.assign(archiveForm, {
    batchNo: `${new Date().getFullYear()}-A-${Math.floor(Math.random() * 10000)}`,
    farmName: '',
    farmAddress: '',
    breedDate: '',
    slaughterDate: '',
    weightGrams: 1500,
    quarantineCertNo: '',
    veterinarian: '',
    feedType: '玉米+豆粕',
    remark: '',
  });
  archiveDialog.value = true;
}

async function submitArchive(): Promise<void> {
  if (!archiveForm.batchNo.trim()) {
    ElMessage.error('批次号必填');
    return;
  }
  const r = await createArchive({
    batchNo: archiveForm.batchNo.trim(),
    farmName: archiveForm.farmName.trim() || undefined,
    farmAddress: archiveForm.farmAddress.trim() || undefined,
    breedDate: archiveForm.breedDate ? new Date(archiveForm.breedDate).getTime() : undefined,
    slaughterDate: archiveForm.slaughterDate ? new Date(archiveForm.slaughterDate).getTime() : undefined,
    weightGrams: archiveForm.weightGrams || undefined,
    quarantineCertNo: archiveForm.quarantineCertNo.trim() || undefined,
    veterinarian: archiveForm.veterinarian.trim() || undefined,
    feedType: archiveForm.feedType.trim() || undefined,
    remark: archiveForm.remark.trim() || undefined,
  });
  if (r.code === '0') {
    ElMessage.success(`档案创建成功,ID=${r.data!.archiveId}`);
    archiveDialog.value = false;
    void fetchArchives();
  } else {
    ElMessage.error(r.message ?? '失败');
  }
}

async function fetchBatches(): Promise<void> {
  batchesLoading.value = true;
  try {
    const r = await listBatches(batchesQuery);
    if (r.code === '0' && r.data) {
      batches.value = r.data.list;
      batchesTotal.value = r.data.total;
    }
  } finally {
    batchesLoading.value = false;
  }
}

function openGenDialog(): void {
  Object.assign(genForm, { name: `批次-${new Date().toISOString().slice(0, 10)}`, count: 100 });
  lastGen.value = null;
  genDialog.value = true;
}

async function submitGen(): Promise<void> {
  if (!genForm.name.trim()) {
    ElMessage.error('批次名必填');
    return;
  }
  if (genForm.count < 1 || genForm.count > 1000) {
    ElMessage.error('数量必须在 1-1000');
    return;
  }
  const r = await generateBatch(genForm.name.trim(), genForm.count);
  if (r.code === '0' && r.data) {
    ElMessage.success(`已生成 ${r.data.totalCount} 个二维码`);
    lastGen.value = { batchId: r.data.batchId, codes: r.data.codes };
    void fetchBatches();
  } else {
    ElMessage.error(r.message ?? '生成失败');
  }
}

async function showBatchCodes(b: BatchVo): Promise<void> {
  const r = await listBatchCodes(b.batchId);
  if (r.code === '0' && r.data) {
    codesData.value = r.data;
    codesDialog.value = true;
  } else {
    ElMessage.error(r.message ?? '查询失败');
  }
}

function exportCsv(): void {
  if (!codesData.value) return;
  const lines = ['qrcodeId,code,status,archiveId'];
  for (const c of codesData.value.codes) {
    lines.push(`${c.qrcodeId},${c.code},${c.status},${c.archiveId ?? ''}`);
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `qrcodes-${codesData.value.batchId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function openBindDialog(): void {
  bindCode.value = '';
  bindArchiveId.value = '';
  bindDialog.value = true;
  setTimeout(() => {
    (document.getElementById('bind-code-input') as HTMLInputElement | null)?.focus();
  }, 100);
}

async function submitBind(): Promise<void> {
  if (!bindCode.value.trim() || !bindArchiveId.value.trim()) {
    ElMessage.error('code 和 archiveId 都必填');
    return;
  }
  const r = await bindQrcodeToArchive(bindCode.value.trim(), bindArchiveId.value.trim());
  if (r.code === '0') {
    ElMessage.success(`已绑定 ${r.data!.code} → 档案 ${r.data!.archiveId}`);
    bindCode.value = '';
    bindArchiveId.value = '';
    setTimeout(() => {
      (document.getElementById('bind-code-input') as HTMLInputElement | null)?.focus();
    }, 100);
  } else {
    ElMessage.error(r.message ?? '绑定失败');
  }
}

onMounted(() => {
  void fetchArchives();
  void fetchBatches();
});
</script>

<template>
  <div class="page">
    <el-tabs v-model="activeTab" type="card">
      <el-tab-pane label="档案管理" name="archives">
        <el-card>
          <div class="toolbar">
            <el-input
              v-model="archiveQuery.keyword"
              placeholder="按批次号/养殖场/检疫证号搜索"
              style="width: 260px"
              clearable
            />
            <el-button type="primary" @click="((archiveQuery.pageNo = 1), fetchArchives())">搜索</el-button>
            <el-button v-if="canWrite()" type="success" @click="openCreateArchive">新增档案</el-button>
          </div>
          <el-table v-loading="archivesLoading" :data="archives" style="margin-top: 16px">
            <el-table-column prop="archiveId" label="ID" width="80" />
            <el-table-column prop="batchNo" label="批次号" width="180" />
            <el-table-column prop="farmName" label="养殖场" width="160" />
            <el-table-column label="出栏日" width="120">
              <template #default="{ row }">
                {{ row.slaughterDate ? new Date(Number(row.slaughterDate)).toLocaleDateString() : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="重量" width="100">
              <template #default="{ row }">{{ row.weightGrams ? `${row.weightGrams} g` : '-' }}</template>
            </el-table-column>
            <el-table-column prop="quarantineCertNo" label="检疫证号" width="180" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : row.status === 'sold' ? 'info' : 'warning'">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="archiveQuery.pageNo"
            v-model:page-size="archiveQuery.pageSize"
            :total="archivesTotal"
            :page-sizes="[10, 20, 50]"
            background
            layout="total, sizes, prev, pager, next"
            style="margin-top: 16px; justify-content: flex-end"
            @current-change="fetchArchives"
            @size-change="fetchArchives"
          />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="二维码批次" name="batches">
        <el-card>
          <div class="toolbar">
            <el-button v-if="canGen()" type="success" @click="openGenDialog">新批次 · 批量生成</el-button>
          </div>
          <el-table v-loading="batchesLoading" :data="batches" style="margin-top: 16px">
            <el-table-column prop="batchId" label="ID" width="100" />
            <el-table-column prop="name" label="名称" />
            <el-table-column prop="totalCount" label="数量" width="120" />
            <el-table-column label="创建时间" width="200">
              <template #default="{ row }">{{ new Date(Number(row.createdAt)).toLocaleString() }}</template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button size="small" @click="showBatchCodes(row)">查看 codes</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="扫码绑档案" name="bind">
        <el-card>
          <p style="color: #5a6275">用扫码枪扫一个 blank 二维码,然后输入要绑定的档案 ID。也可手动输入 code。</p>
          <el-button v-if="canBind()" type="primary" size="large" @click="openBindDialog">打开扫码绑定界面</el-button>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="archiveDialog" title="新增溯源档案" width="600px">
      <el-form :model="archiveForm" label-width="100px">
        <el-form-item label="批次号" required>
          <el-input v-model="archiveForm.batchNo" />
        </el-form-item>
        <el-form-item label="养殖场">
          <el-input v-model="archiveForm.farmName" />
        </el-form-item>
        <el-form-item label="养殖场地址">
          <el-input v-model="archiveForm.farmAddress" />
        </el-form-item>
        <el-form-item label="出生日期">
          <el-date-picker v-model="archiveForm.breedDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="出栏日期">
          <el-date-picker v-model="archiveForm.slaughterDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="出栏重量(g)">
          <el-input-number v-model="archiveForm.weightGrams" :min="1" :step="100" />
        </el-form-item>
        <el-form-item label="检疫证号">
          <el-input v-model="archiveForm.quarantineCertNo" />
        </el-form-item>
        <el-form-item label="检疫员">
          <el-input v-model="archiveForm.veterinarian" />
        </el-form-item>
        <el-form-item label="饲料种类">
          <el-input v-model="archiveForm.feedType" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="archiveForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="archiveDialog = false">取消</el-button>
        <el-button type="primary" @click="submitArchive">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="genDialog" title="批量生成二维码" width="520px">
      <el-form label-width="80px">
        <el-form-item label="批次名">
          <el-input v-model="genForm.name" />
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="genForm.count" :min="1" :max="1000" />
          <span style="margin-left: 8px; color: #94a3b8">单批最多 1000 个</span>
        </el-form-item>
      </el-form>
      <div v-if="lastGen" style="margin-top: 16px; padding: 12px; background: #f0fdf4; border-radius: 8px">
        <p style="margin: 0 0 8px; color: #16a34a; font-weight: 700">✅ 已生成 batchId={{ lastGen.batchId }}</p>
        <p style="margin: 0; font-size: 12px; color: #5a6275">前 3 个 code 示例:</p>
        <pre style="margin: 4px 0; font-size: 12px">{{ lastGen.codes.slice(0, 3).join('\n') }}</pre>
      </div>
      <template #footer>
        <el-button @click="genDialog = false">关闭</el-button>
        <el-button type="primary" @click="submitGen">生成</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="codesDialog" title="批次内 codes" width="720px">
      <div v-if="codesData">
        <p>
          批次 <b>{{ codesData.name }}</b> · 共 <b>{{ codesData.codes.length }}</b> 个
        </p>
        <el-button size="small" @click="exportCsv">导出 CSV</el-button>
        <el-table :data="codesData.codes.slice(0, 50)" style="margin-top: 12px" max-height="400">
          <el-table-column prop="qrcodeId" label="ID" width="80" />
          <el-table-column prop="code" label="二维码 code" />
          <el-table-column prop="status" label="状态" width="100" />
          <el-table-column prop="archiveId" label="绑定档案" width="120" />
        </el-table>
        <p v-if="codesData.codes.length > 50" style="color: #94a3b8; font-size: 12px">仅显示前 50 个,完整请导出 CSV</p>
      </div>
    </el-dialog>

    <el-dialog v-model="bindDialog" title="扫码绑定档案" width="520px">
      <el-form label-width="100px">
        <el-form-item label="二维码 code">
          <el-input
            id="bind-code-input"
            v-model="bindCode"
            placeholder="扫码枪扫描后自动填入,或手动输入"
            @keyup.enter="submitBind"
          />
        </el-form-item>
        <el-form-item label="档案 ID">
          <el-input v-model="bindArchiveId" placeholder="从档案列表复制" @keyup.enter="submitBind" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bindDialog = false">关闭</el-button>
        <el-button type="primary" @click="submitBind">绑定 (Enter)</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page {
  padding: 16px;
}
.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
</style>
