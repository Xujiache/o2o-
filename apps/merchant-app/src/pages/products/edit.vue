<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { createProduct, listCategories, type CategoryVo, type SkuReq } from '@/api';

const categories = ref<CategoryVo[]>([]);
const categoryId = ref('');
const name = ref('');
const description = ref('');
const hasSku = ref<0 | 1>(0);
const price = ref(1000);
const stock = ref(10);
const stockAlertThreshold = ref(5);
const skus = ref<SkuReq[]>([]);
const submitting = ref(false);
const errorMsg = ref('');
const okMsg = ref('');

const canSubmit = computed(() => {
  if (!categoryId.value || !name.value) return false;
  if (hasSku.value === 1) return skus.value.length > 0;
  return price.value > 0 && stock.value >= 0;
});

onMounted(async () => {
  const r = await listCategories();
  if (r.code === '0' && r.data) categories.value = r.data;
  if (categories.value[0]) categoryId.value = categories.value[0].categoryId;
});

function addSku(): void {
  skus.value.push({ specValue: `规格${skus.value.length + 1}`, price: 1000, stock: 10 });
}

function removeSku(i: number): void {
  skus.value.splice(i, 1);
}

async function onSubmit(): Promise<void> {
  errorMsg.value = '';
  okMsg.value = '';
  submitting.value = true;
  try {
    const r = await createProduct({
      categoryId: categoryId.value,
      name: name.value,
      description: description.value || undefined,
      hasSku: hasSku.value,
      price: hasSku.value === 0 ? price.value : undefined,
      stock: hasSku.value === 0 ? stock.value : undefined,
      stockAlertThreshold: stockAlertThreshold.value,
      skus: hasSku.value === 1 ? skus.value : undefined,
      saleStatus: 'draft',
    });
    if (r.code !== '0') {
      errorMsg.value = r.message;
      return;
    }
    okMsg.value = `已创建,商品 ID:${r.data?.productId}`;
    setTimeout(() => uni.navigateBack(), 1000);
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '保存失败';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="edit">
    <view class="edit__title">新增商品</view>
    <text class="edit__label">分类</text>
    <picker
      mode="selector"
      :range="categories.map((c) => c.name)"
      @change="(e: any) => (categoryId = categories[e.detail.value]?.categoryId ?? '')"
    >
      <view class="edit__field">{{ categories.find((c) => c.categoryId === categoryId)?.name || '请选择分类' }}</view>
    </picker>

    <text class="edit__label">名称</text>
    <input class="edit__field" v-model="name" maxlength="128" />

    <text class="edit__label">描述</text>
    <input class="edit__field" v-model="description" />

    <view class="edit__row">
      <text>多规格(SKU)</text>
      <switch :checked="hasSku === 1" @change="(e: any) => (hasSku = e.detail.value ? 1 : 0)" />
    </view>

    <template v-if="hasSku === 0">
      <text class="edit__label">价格(分)</text>
      <input class="edit__field" type="number" v-model.number="price" />
      <text class="edit__label">库存</text>
      <input class="edit__field" type="number" v-model.number="stock" />
    </template>
    <template v-else>
      <text class="edit__label">SKU 列表</text>
      <view v-for="(s, i) in skus" :key="i" class="edit__sku">
        <input class="edit__sku-spec" v-model="s.specValue" placeholder="规格" />
        <input class="edit__sku-price" type="number" v-model.number="s.price" placeholder="价格" />
        <input class="edit__sku-stock" type="number" v-model.number="s.stock" placeholder="库存" />
        <text class="edit__sku-rm" @click="removeSku(i)">×</text>
      </view>
      <button class="edit__sku-add" @click="addSku">+ 添加 SKU</button>
    </template>

    <text class="edit__label">库存预警阈值</text>
    <input class="edit__field" type="number" v-model.number="stockAlertThreshold" />

    <button class="edit__submit" :disabled="!canSubmit || submitting" @click="onSubmit">
      {{ submitting ? '保存中...' : '保存' }}
    </button>

    <text v-if="okMsg" class="edit__ok">{{ okMsg }}</text>
    <text v-if="errorMsg" class="edit__error">{{ errorMsg }}</text>
  </view>
</template>

<style scoped>
.edit {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.edit__title {
  font-size: 36rpx;
  font-weight: 600;
}
.edit__label {
  font-size: 24rpx;
  color: #666;
  margin-top: 16rpx;
}
.edit__field {
  font-size: 28rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #ddd;
}
.edit__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
}
.edit__sku {
  display: flex;
  gap: 8rpx;
  align-items: center;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #eee;
}
.edit__sku-spec {
  flex: 2;
  font-size: 24rpx;
}
.edit__sku-price,
.edit__sku-stock {
  flex: 1;
  font-size: 24rpx;
}
.edit__sku-rm {
  color: #ff4d4f;
  font-size: 36rpx;
  padding: 0 8rpx;
}
.edit__sku-add {
  margin-top: 16rpx;
  background: #fff;
  border: 1rpx dashed #4c84ff;
  color: #4c84ff;
  font-size: 24rpx;
  padding: 16rpx;
  border-radius: 8rpx;
}
.edit__submit {
  margin-top: 48rpx;
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
.edit__submit[disabled] {
  background: #c5d4ff;
}
.edit__ok {
  color: #52c41a;
}
.edit__error {
  color: #ff4d4f;
}
</style>
