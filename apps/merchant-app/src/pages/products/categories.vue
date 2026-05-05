<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { createCategory, listCategories, type CategoryVo } from '@/api';

const list = ref<CategoryVo[]>([]);
const loading = ref(false);
const newName = ref('');
const submitting = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await listCategories();
    if (r.code === '0' && r.data) list.value = r.data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function onAdd(): Promise<void> {
  if (!newName.value.trim() || submitting.value) return;
  submitting.value = true;
  try {
    await createCategory({ name: newName.value.trim() });
    newName.value = '';
    await load();
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="cat">
    <view class="cat__title">商品分类</view>
    <view class="cat__add">
      <input class="cat__field" placeholder="新分类名称" v-model="newName" maxlength="64" />
      <button class="cat__btn" :disabled="submitting" @click="onAdd">新增</button>
    </view>
    <view v-if="loading">加载中...</view>
    <view v-else>
      <view v-for="c in list" :key="c.categoryId" class="cat__item">
        <text>{{ c.name }}</text>
        <text class="cat__order">#{{ c.displayOrder }}</text>
      </view>
      <view v-if="list.length === 0" class="cat__empty">暂无分类</view>
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
  background: #4c84ff;
  color: #fff;
  font-size: 24rpx;
  padding: 12rpx 24rpx;
  border-radius: 12rpx;
}
.cat__item {
  background: #fff;
  padding: 24rpx;
  margin-top: 16rpx;
  border-radius: 8rpx;
  display: flex;
  justify-content: space-between;
}
.cat__order {
  color: #888;
  font-size: 22rpx;
}
.cat__empty {
  text-align: center;
  color: #999;
  padding: 48rpx 0;
}
</style>
