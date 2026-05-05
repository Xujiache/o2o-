<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';

import { getIntegrationsHealth, type IntegrationHealthVo } from '@/api';
import {
  type ProviderStatus,
  type ThirdPartyConfigItemVo,
  listIntegrations,
  patchIntegration,
} from '@/api/admin-third-party';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const canManage = (): boolean => userStore.has('admin:third-party:manage');

const loading = ref(false);
const list = ref<ThirdPartyConfigItemVo[]>([]);
const health = ref<IntegrationHealthVo[]>([]);

const drawerVisible = ref(false);
const drawerRow = ref<ThirdPartyConfigItemVo | null>(null);
const form = reactive<{ secret: string; status: ProviderStatus }>({ secret: '', status: 'active' });

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const [r1, r2] = await Promise.all([listIntegrations(), getIntegrationsHealth()]);
    if (r1.code === '0' && r1.data) list.value = r1.data.list;
    if (r2.code === '0' && r2.data) health.value = r2.data;
  } finally {
    loading.value = false;
  }
}

function openDrawer(row: ThirdPartyConfigItemVo): void {
  drawerRow.value = row;
  form.secret = '';
  form.status = row.status;
  drawerVisible.value = true;
}

async function save(): Promise<void> {
  if (!drawerRow.value) return;
  const body: { secret?: string; status?: ProviderStatus } = {};
  if (form.secret.trim()) body.secret = form.secret.trim();
  if (form.status !== drawerRow.value.status) body.status = form.status;
  if (Object.keys(body).length === 0) {
    ElMessage.info('未修改');
    return;
  }
  const r = await patchIntegration(drawerRow.value.provider, body);
  if (r.code === '0') {
    ElMessage.success(`已保存(变更字段:${r.data?.changedFields.join(',') || '-'})`);
    drawerVisible.value = false;
    void fetchList();
  }
}

function fmtDate(ts: string | null | undefined): string {
  if (!ts) return '-';
  const n = Number(ts);
  if (!n) return '-';
  return new Date(n).toLocaleString();
}

onMounted(fetchList);
</script>

<template>
  <div class="integrations">
    <el-card>
      <template #header>
        <div class="header">
          <span>第三方配置</span>
          <span v-if="!canManage()" class="readonly-tag">只读 — 缺 admin:third-party:manage 权限</span>
        </div>
      </template>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="provider" prop="provider" width="180" />
        <el-table-column label="env" prop="env" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : row.status === 'error' ? 'danger' : 'info'">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="secret(脱敏)" min-width="160">
          <template #default="{ row }">
            <code class="ga">{{ row.secretMasked || '<未设置>' }}</code>
          </template>
        </el-table-column>
        <el-table-column label="健康检查" min-width="200">
          <template #default="{ row }">
            <span v-if="health.find((h) => h.provider === row.provider)">
              {{ fmtDate(health.find((h) => h.provider === row.provider)?.lastCheckedAt?.toString() ?? null) }}
              {{ health.find((h) => h.provider === row.provider)?.errorMessage ?? '' }}
            </span>
            <span v-else class="muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="updatedAt" width="180">
          <template #default="{ row }">{{ fmtDate(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canManage()" link type="primary" size="small" @click="openDrawer(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer v-model="drawerVisible" :title="drawerRow?.provider" size="420px">
      <el-form v-if="drawerRow" label-width="100px">
        <el-form-item label="provider">
          <el-input :value="drawerRow.provider" disabled />
        </el-form-item>
        <el-form-item label="env">
          <el-input :value="drawerRow.env" disabled />
        </el-form-item>
        <el-form-item label="status">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="active" value="active" />
            <el-option label="disabled" value="disabled" />
            <el-option label="error" value="error" />
          </el-select>
        </el-form-item>
        <el-form-item label="secret">
          <el-input v-model="form.secret" type="password" placeholder="留空 = 不修改" show-password />
          <div class="hint">明文输入将自动加密存储</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="drawerVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.integrations {
  padding: 16px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.readonly-tag {
  color: #999;
  font-size: 12px;
}
.muted {
  color: #999;
}
.ga {
  font-family: monospace;
  font-size: 12px;
}
.hint {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
}
</style>
