<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import { onMounted, reactive, ref, watch } from 'vue';

import {
  type CategoryBizType,
  type CategoryItemVo,
  createCategory,
  disableCategory,
  listCategoryTree,
  updateCategory,
} from '@/api/admin-categories';
import { useUserStore } from '@/stores/user';

const props = defineProps<{ bizType: CategoryBizType; title?: string }>();

const userStore = useUserStore();
const canManage = (): boolean => userStore.has('admin:categories:manage');

const loading = ref(false);
const tree = ref<CategoryItemVo[]>([]);

const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const dialogParentId = ref('0');
const form = reactive<{ categoryId: string; name: string; iconUrl: string; displayOrder: number; enabled: boolean }>({
  categoryId: '',
  name: '',
  iconUrl: '',
  displayOrder: 0,
  enabled: true,
});

async function fetchTree(): Promise<void> {
  loading.value = true;
  try {
    const r = await listCategoryTree(props.bizType);
    if (r.code === '0' && r.data) {
      tree.value = r.data.list;
    }
  } finally {
    loading.value = false;
  }
}

function openCreate(parentId: string): void {
  dialogMode.value = 'create';
  dialogParentId.value = parentId;
  form.categoryId = '';
  form.name = '';
  form.iconUrl = '';
  form.displayOrder = 0;
  form.enabled = true;
  dialogVisible.value = true;
}

function openEdit(row: CategoryItemVo): void {
  dialogMode.value = 'edit';
  form.categoryId = row.categoryId;
  form.name = row.name;
  form.iconUrl = row.iconUrl ?? '';
  form.displayOrder = row.displayOrder;
  form.enabled = row.enabled;
  dialogVisible.value = true;
}

async function submit(): Promise<void> {
  if (!form.name.trim()) {
    ElMessage.warning('请填写名称');
    return;
  }
  if (dialogMode.value === 'create') {
    const r = await createCategory({
      bizType: props.bizType,
      parentId: dialogParentId.value,
      name: form.name.trim(),
      iconUrl: form.iconUrl || undefined,
      displayOrder: form.displayOrder,
    });
    if (r.code === '0') {
      ElMessage.success('已新增');
      dialogVisible.value = false;
      void fetchTree();
    }
  } else {
    const r = await updateCategory(form.categoryId, {
      name: form.name,
      iconUrl: form.iconUrl || undefined,
      displayOrder: form.displayOrder,
      enabled: form.enabled,
    });
    if (r.code === '0') {
      ElMessage.success('已保存');
      dialogVisible.value = false;
      void fetchTree();
    }
  }
}

async function onDisable(row: CategoryItemVo): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认禁用 ${row.name}?`, '禁用确认', { type: 'warning' });
    const r = await disableCategory(row.categoryId);
    if (r.code === '0') {
      ElMessage.success('已禁用');
      void fetchTree();
    }
  } catch {
    /* user cancel */
  }
}

watch(
  () => props.bizType,
  () => {
    void fetchTree();
  },
);

onMounted(fetchTree);
</script>

<template>
  <el-card v-loading="loading">
    <template #header>
      <div class="header">
        <span>{{ props.title ?? (props.bizType === 'takeaway' ? '外卖类目' : '跑腿类目') }}</span>
        <el-button v-if="canManage()" type="primary" size="small" @click="openCreate('0')">+ 新增顶级类目</el-button>
      </div>
    </template>

    <ul class="tree">
      <li v-for="t in tree" :key="t.categoryId" class="tree__node">
        <div class="tree__row" :class="{ 'tree__row--disabled': !t.enabled }">
          <span class="tree__name">{{ t.name }}</span>
          <span class="tree__order">order={{ t.displayOrder }}</span>
          <el-tag size="small" :type="t.enabled ? 'success' : 'info'">{{ t.enabled ? '启用' : '禁用' }}</el-tag>
          <span class="tree__actions">
            <el-button v-if="canManage()" link size="small" @click="openCreate(t.categoryId)">+ 子类目</el-button>
            <el-button v-if="canManage()" link size="small" type="primary" @click="openEdit(t)">编辑</el-button>
            <el-button v-if="canManage() && t.enabled" link size="small" type="danger" @click="onDisable(t)">
              禁用
            </el-button>
          </span>
        </div>
        <ul v-if="t.children && t.children.length" class="tree__children">
          <li v-for="c in t.children" :key="c.categoryId" class="tree__node tree__node--child">
            <div class="tree__row" :class="{ 'tree__row--disabled': !c.enabled }">
              <span class="tree__name">{{ c.name }}</span>
              <span class="tree__order">order={{ c.displayOrder }}</span>
              <el-tag size="small" :type="c.enabled ? 'success' : 'info'">{{ c.enabled ? '启用' : '禁用' }}</el-tag>
              <span class="tree__actions">
                <el-button v-if="canManage()" link size="small" type="primary" @click="openEdit(c)">编辑</el-button>
                <el-button v-if="canManage() && c.enabled" link size="small" type="danger" @click="onDisable(c)">
                  禁用
                </el-button>
              </span>
            </div>
          </li>
        </ul>
      </li>
      <li v-if="!loading && tree.length === 0" class="tree__empty">暂无类目</li>
    </ul>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增类目' : `编辑类目 ${form.categoryId}`"
      width="520px"
    >
      <el-form label-width="100px">
        <el-form-item label="名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="iconUrl">
          <el-input v-model="form.iconUrl" placeholder="可选" />
        </el-form-item>
        <el-form-item label="displayOrder">
          <el-input-number v-model="form.displayOrder" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item v-if="dialogMode === 'edit'" label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.tree {
  list-style: none;
  padding: 0;
  margin: 0;
}
.tree__row {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px dashed #eee;
}
.tree__row--disabled {
  opacity: 0.6;
}
.tree__name {
  font-weight: 500;
}
.tree__order {
  color: #999;
  font-size: 12px;
}
.tree__actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
}
.tree__children {
  list-style: none;
  padding-left: 24px;
  margin: 0;
}
.tree__node--child .tree__row {
  background: #fafafa;
  padding-left: 12px;
}
.tree__empty {
  padding: 32px 0;
  text-align: center;
  color: #999;
}
</style>
