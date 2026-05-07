<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { createCategory, type CategoryVo, deleteCategory, listCategories, updateCategory } from '@/api';

const list = ref<CategoryVo[]>([]);
const loading = ref(false);
const newName = ref('');
const submitting = ref(false);
const editingId = ref<string | null>(null);
const editingName = ref('');

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await listCategories();
    if (r.code === '0' && r.data) list.value = r.data.slice().sort((a, b) => a.displayOrder - b.displayOrder);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function onAdd(): Promise<void> {
  if (!newName.value.trim() || submitting.value) return;
  submitting.value = true;
  try {
    const maxOrder = list.value.reduce((m, c) => Math.max(m, c.displayOrder), 0);
    const r = await createCategory({ name: newName.value.trim(), displayOrder: maxOrder + 1 });
    if (r.code === '0') {
      newName.value = '';
      await load();
      uni.showToast({ title: '已新增', icon: 'success' });
    } else {
      uni.showToast({ title: r.message || '新增失败', icon: 'none' });
    }
  } finally {
    submitting.value = false;
  }
}

function startEdit(c: CategoryVo): void {
  editingId.value = c.categoryId;
  editingName.value = c.name;
}

function cancelEdit(): void {
  editingId.value = null;
  editingName.value = '';
}

async function saveEdit(c: CategoryVo): Promise<void> {
  const name = editingName.value.trim();
  if (!name || name === c.name) {
    cancelEdit();
    return;
  }
  const r = await updateCategory(c.categoryId, { name });
  if (r.code === '0') {
    cancelEdit();
    await load();
    uni.showToast({ title: '已保存', icon: 'success' });
  } else {
    uni.showToast({ title: r.message || '保存失败', icon: 'none' });
  }
}

async function moveUp(idx: number): Promise<void> {
  if (idx <= 0) return;
  const cur = list.value[idx];
  const prev = list.value[idx - 1];
  if (!cur || !prev) return;
  // 交换 displayOrder
  const r1 = await updateCategory(cur.categoryId, { displayOrder: prev.displayOrder });
  const r2 = await updateCategory(prev.categoryId, { displayOrder: cur.displayOrder });
  if (r1.code === '0' && r2.code === '0') {
    await load();
  } else {
    uni.showToast({ title: '排序失败', icon: 'none' });
  }
}

async function moveDown(idx: number): Promise<void> {
  if (idx >= list.value.length - 1) return;
  const cur = list.value[idx];
  const next = list.value[idx + 1];
  if (!cur || !next) return;
  const r1 = await updateCategory(cur.categoryId, { displayOrder: next.displayOrder });
  const r2 = await updateCategory(next.categoryId, { displayOrder: cur.displayOrder });
  if (r1.code === '0' && r2.code === '0') {
    await load();
  } else {
    uni.showToast({ title: '排序失败', icon: 'none' });
  }
}

async function onDelete(c: CategoryVo): Promise<void> {
  const ok = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '删除分类',
      content: `确认删除「${c.name}」?该分类下若有商品将无法删除。`,
      success: (res) => resolve(!!res.confirm),
    });
  });
  if (!ok) return;
  const r = await deleteCategory(c.categoryId);
  if (r.code === '0') {
    await load();
    uni.showToast({ title: '已删除', icon: 'success' });
  } else {
    uni.showToast({ title: r.message || '删除失败', icon: 'none' });
  }
}
</script>

<template>
  <view class="cat">
    <view class="cat__title">商品分类</view>
    <view class="cat__hint">每家店的分类相互独立。新建商品时会从这里选择所属分类。</view>

    <view class="cat__add">
      <input class="cat__field" placeholder="新分类名称" v-model="newName" maxlength="64" />
      <button class="cat__btn" :disabled="submitting" @click="onAdd">新增</button>
    </view>

    <view v-if="loading" class="cat__loading">加载中...</view>
    <view v-else>
      <view v-for="(c, idx) in list" :key="c.categoryId" class="cat__item">
        <view v-if="editingId === c.categoryId" class="cat__edit-row">
          <input class="cat__edit-field" v-model="editingName" maxlength="64" focus />
          <text class="cat__op cat__op--ok" @tap="saveEdit(c)">保存</text>
          <text class="cat__op" @tap="cancelEdit">取消</text>
        </view>
        <view v-else class="cat__row">
          <view class="cat__main">
            <text class="cat__name">{{ c.name }}</text>
            <text class="cat__order">#{{ c.displayOrder }}</text>
          </view>
          <view class="cat__ops">
            <text class="cat__op" :class="{ 'cat__op--mute': idx === 0 }" @tap="moveUp(idx)">↑</text>
            <text class="cat__op" :class="{ 'cat__op--mute': idx === list.length - 1 }" @tap="moveDown(idx)">↓</text>
            <text class="cat__op" @tap="startEdit(c)">改名</text>
            <text class="cat__op cat__op--danger" @tap="onDelete(c)">删除</text>
          </view>
        </view>
      </view>
      <view v-if="list.length === 0" class="cat__empty">暂无分类,先新增一个吧</view>
    </view>
  </view>
</template>

<style scoped>
.cat {
  padding: 32rpx;
}
.cat__title {
  font-size: 36rpx;
  font-weight: 600;
}
.cat__hint {
  font-size: 22rpx;
  color: #8a94a6;
  margin-top: 8rpx;
}
.cat__add {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
  align-items: flex-end;
}
.cat__field {
  flex: 1;
  font-size: 28rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #ddd;
}
.cat__btn {
  background: #b7791f;
  color: #fff;
  font-size: 24rpx;
  padding: 12rpx 24rpx;
  border-radius: 12rpx;
}
.cat__loading {
  text-align: center;
  color: #8a94a6;
  padding: 32rpx 0;
}
.cat__item {
  background: #fff;
  padding: 20rpx 24rpx;
  margin-top: 16rpx;
  border-radius: 12rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, 0.06);
}
.cat__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cat__main {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  flex: 1;
}
.cat__name {
  font-size: 30rpx;
  color: #172033;
  font-weight: 500;
}
.cat__order {
  color: #8a94a6;
  font-size: 22rpx;
}
.cat__ops {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.cat__op {
  font-size: 24rpx;
  color: #b7791f;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(183, 121, 31, 0.08);
}
.cat__op--mute {
  color: #c5c9d2;
  background: rgba(0, 0, 0, 0.03);
}
.cat__op--danger {
  color: #d93025;
  background: rgba(217, 48, 37, 0.08);
}
.cat__op--ok {
  color: #fff;
  background: #1e8e3e;
}
.cat__edit-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.cat__edit-field {
  flex: 1;
  font-size: 28rpx;
  padding: 12rpx 18rpx;
  border: 1rpx solid #b7791f;
  border-radius: 8rpx;
}
.cat__empty {
  text-align: center;
  color: #8a94a6;
  padding: 64rpx 0;
}
</style>
