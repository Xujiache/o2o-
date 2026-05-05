<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import { onMounted, ref } from 'vue';

import {
  type PermissionGroupVo,
  type RoleItemVo,
  listPermissions,
  listRoles,
  updateRolePermissions,
} from '@/api/admin-roles';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const canManage = (): boolean => userStore.has('admin:roles:manage');

const loading = ref(false);
const roles = ref<RoleItemVo[]>([]);
const groups = ref<PermissionGroupVo[]>([]);
const selectedRoleId = ref<string>('');
const checked = ref<string[]>([]);

const groupTitleMap: Record<string, string> = {
  customer: '用户端',
  merchant: '商家端',
  rider: '骑手端',
  admin: '平台 Web',
  public: '公共',
};

async function fetchAll(): Promise<void> {
  loading.value = true;
  try {
    const [rRoles, rPerms] = await Promise.all([listRoles(), listPermissions()]);
    if (rRoles.code === '0' && rRoles.data) roles.value = rRoles.data.list;
    if (rPerms.code === '0' && rPerms.data) groups.value = rPerms.data.groups;
    if (!selectedRoleId.value && roles.value.length) selectRole(roles.value[0]!.roleId);
  } finally {
    loading.value = false;
  }
}

function selectRole(roleId: string): void {
  selectedRoleId.value = roleId;
  const role = roles.value.find((r) => r.roleId === roleId);
  checked.value = role ? [...role.permissionCodes] : [];
}

function toggle(code: string): void {
  if (!canManage()) return;
  const idx = checked.value.indexOf(code);
  if (idx >= 0) checked.value.splice(idx, 1);
  else checked.value.push(code);
}

function toggleGroup(group: PermissionGroupVo, on: boolean): void {
  if (!canManage()) return;
  for (const p of group.permissions) {
    const idx = checked.value.indexOf(p.code);
    if (on && idx === -1) checked.value.push(p.code);
    if (!on && idx >= 0) checked.value.splice(idx, 1);
  }
}

async function save(): Promise<void> {
  if (!selectedRoleId.value) return;
  const role = roles.value.find((r) => r.roleId === selectedRoleId.value)!;
  if ((role.code === 'SUPER_ADMIN' || role.code === 'AUDITOR') && checked.value.length === 0) {
    ElMessage.warning('内置角色不允许清空全部权限');
    return;
  }
  try {
    await ElMessageBox.confirm(`角色 ${role.code} 即将更新权限(共 ${checked.value.length} 项),确认?`, '保存确认', {
      type: 'warning',
    });
    const r = await updateRolePermissions(selectedRoleId.value, checked.value);
    if (r.code === '0') {
      ElMessage.success(`已保存 — 影响 ${r.data?.affectedAdminUsers ?? 0} 名管理员`);
      void fetchAll();
    }
  } catch {
    /* user cancel */
  }
}

onMounted(fetchAll);
</script>

<template>
  <div class="rp" v-loading="loading">
    <el-card class="rp__roles">
      <template #header>角色列表</template>
      <ul class="rp__role-list">
        <li
          v-for="r in roles"
          :key="r.roleId"
          :class="{ 'rp__role--active': r.roleId === selectedRoleId }"
          @click="selectRole(r.roleId)"
        >
          <div class="rp__role-line">
            <span class="rp__role-code">{{ r.code }}</span>
            <el-tag size="small">{{ r.scope }}</el-tag>
          </div>
          <div class="rp__role-meta">
            <span>{{ r.name }}</span>
            <span class="rp__role-count">{{ r.permissionCodes.length }} 权限</span>
          </div>
        </li>
      </ul>
    </el-card>

    <el-card class="rp__perms">
      <template #header>
        <div class="rp__perms-header">
          <span>权限点 — {{ roles.find((r) => r.roleId === selectedRoleId)?.code ?? '请选择角色' }}</span>
          <el-button v-if="canManage()" type="primary" :disabled="!selectedRoleId" @click="save">保存</el-button>
          <span v-else class="readonly">只读 — 缺 admin:roles:manage 权限</span>
        </div>
      </template>
      <div v-for="g in groups" :key="g.group" class="rp__group">
        <div class="rp__group-title">
          <span>{{ groupTitleMap[g.group] ?? g.group }} ({{ g.permissions.length }})</span>
          <span v-if="canManage()" class="rp__group-actions">
            <el-button link size="small" @click="toggleGroup(g, true)">全选</el-button>
            <el-button link size="small" @click="toggleGroup(g, false)">全不选</el-button>
          </span>
        </div>
        <div class="rp__perm-grid">
          <el-checkbox
            v-for="p in g.permissions"
            :key="p.code"
            :model-value="checked.includes(p.code)"
            :disabled="!canManage()"
            @change="toggle(p.code)"
          >
            <span class="rp__perm-name">{{ p.name }}</span>
            <code class="rp__perm-code">{{ p.code }}</code>
          </el-checkbox>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.rp {
  display: flex;
  gap: 16px;
  padding: 16px;
}
.rp__roles {
  width: 280px;
  flex-shrink: 0;
}
.rp__perms {
  flex: 1;
}
.rp__role-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.rp__role-list li {
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  border-radius: 4px;
}
.rp__role-list li:hover {
  background: #f5f7fa;
}
.rp__role--active {
  background: #ecf5ff !important;
}
.rp__role-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.rp__role-code {
  font-weight: 600;
}
.rp__role-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
.rp__perms-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.readonly {
  color: #999;
  font-size: 12px;
}
.rp__group {
  margin-bottom: 18px;
}
.rp__group-title {
  font-weight: 500;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.rp__group-actions {
  display: flex;
  gap: 4px;
}
.rp__perm-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding-left: 12px;
}
.rp__perm-name {
  margin-right: 6px;
}
.rp__perm-code {
  color: #999;
  font-size: 12px;
}
</style>
