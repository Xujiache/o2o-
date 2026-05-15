<script setup lang="ts">
import { ElMessage, ElMessageBox, type InputInstance } from 'element-plus';
import { computed, nextTick, onMounted, reactive, ref } from 'vue';

import {
  GROCERY_DELIVERY_METHOD_LABELS,
  GROCERY_LIMITS,
  GROCERY_PRICED_BY_LABELS,
  GROCERY_PRICE_DISPLAY_RULE_LABELS,
  type CreateGroceryProductReq,
  type GroceryCategoryVo,
  type GroceryDeliveryMethod,
  type GroceryPriceDisplayRule,
  type GroceryPricedBy,
  type GroceryProductVo,
  type GrocerySkuItem,
  type ProductSaleStatus,
  adjustGroceryProductStock,
  createGroceryCategory,
  createGroceryProduct,
  listAdminGroceryCategories,
  listAdminGroceryProducts,
  shelfGroceryProduct,
  updateGroceryProduct,
} from '@/api/admin-grocery-products';
import MultiImageUpload from '@/components/MultiImageUpload.vue';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const canWrite = (): boolean => userStore.has('admin:grocery:product:write');

const loading = ref(false);
const list = ref<GroceryProductVo[]>([]);
const total = ref(0);
const categories = ref<GroceryCategoryVo[]>([]);
const categoryNames = ref<Record<string, string>>({});
const query = reactive<{
  keyword: string;
  categoryId: string;
  saleStatus: '' | ProductSaleStatus;
  pageNo: number;
  pageSize: number;
}>({
  keyword: '',
  categoryId: '',
  saleStatus: '',
  pageNo: 1,
  pageSize: 20,
});

const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const editingId = ref('');

interface SkuRow extends GrocerySkuItem {
  /** UI 用元(可带小数);提交时 *100 转 cents */
  priceYuan: number;
}

const form = reactive<{
  categoryId: string;
  name: string;
  description: string;
  mainImageFileIds: string[];
  mainImagePreviews: string[];
  detailImageFileIds: string[];
  detailImagePreviews: string[];
  tags: string[];
  pricedBy: GroceryPricedBy;
  unitPriceYuan: number;
  estimatedWeightGrams: number;
  initialStockJin: number;
  deliveryMethods: GroceryDeliveryMethod[];
  priceDisplayRule: GroceryPriceDisplayRule;
  skus: SkuRow[];
  saleStatus: ProductSaleStatus;
  hasTraceability: boolean;
}>({
  categoryId: '',
  name: '',
  description: '',
  mainImageFileIds: [],
  mainImagePreviews: [],
  detailImageFileIds: [],
  detailImagePreviews: [],
  tags: [],
  pricedBy: 'weight',
  unitPriceYuan: 10,
  estimatedWeightGrams: 500,
  initialStockJin: 0,
  deliveryMethods: ['self_pickup'],
  priceDisplayRule: 'starting',
  skus: [],
  saleStatus: 'on_shelf',
  hasTraceability: false,
});

const tagInputVisible = ref(false);
const tagInputValue = ref('');
const tagInputRef = ref<InputInstance | null>(null);

const stockDialog = ref(false);
const stockTarget = ref<GroceryProductVo | null>(null);
const stockDelta = ref(0);
const stockReason = ref('');

const catDialog = ref(false);
const newCatName = ref('');

const statusLabel: Record<ProductSaleStatus, string> = {
  on_shelf: '在售',
  off_shelf: '已下架',
  sold_out: '已售罄',
};

function yuanFromCents(cents: string | number): string {
  return (Number(cents) / 100).toFixed(2);
}

function priceCellOf(row: GroceryProductVo): string {
  if (row.pricedBy === 'sku') {
    if (row.priceFromCents && row.priceToCents && row.priceFromCents !== row.priceToCents) {
      return `¥${yuanFromCents(row.priceFromCents)} ~ ¥${yuanFromCents(row.priceToCents)}`;
    }
    if (row.priceFromCents) return `¥${yuanFromCents(row.priceFromCents)} 起`;
    return '—';
  }
  const unit = row.pricedBy === 'piece' ? '/件' : '/斤';
  return `¥${yuanFromCents(row.unitPriceCentsPerJin)}${unit}`;
}

function stockCellOf(row: GroceryProductVo): string {
  if (row.pricedBy === 'sku') {
    const total = row.skus.reduce((acc, s) => acc + Number(s.stockJin), 0);
    return `${total.toFixed(2)} (${row.skus.length} 规格)`;
  }
  return Number(row.stockJin).toFixed(2) + (row.pricedBy === 'piece' ? ' 件' : ' 斤');
}

function thumbOf(row: GroceryProductVo): string | undefined {
  return row.mainImageUrls?.[0] ?? row.coverImageUrl ?? undefined;
}

async function fetchCategories(): Promise<void> {
  const r = await listAdminGroceryCategories();
  if (r.code === '0' && r.data) {
    categories.value = r.data.list;
  }
}

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const r = await listAdminGroceryProducts({
      keyword: query.keyword || undefined,
      categoryId: query.categoryId || undefined,
      saleStatus: query.saleStatus === '' ? undefined : query.saleStatus,
      pageNo: query.pageNo,
      pageSize: query.pageSize,
    });
    if (r.code === '0' && r.data) {
      list.value = r.data.list;
      total.value = r.data.total;
      if (r.data.categoryNames) categoryNames.value = r.data.categoryNames;
    }
  } finally {
    loading.value = false;
  }
}

function resetForm(): void {
  form.categoryId = categories.value[0]?.categoryId ?? '';
  form.name = '';
  form.description = '';
  form.mainImageFileIds = [];
  form.mainImagePreviews = [];
  form.detailImageFileIds = [];
  form.detailImagePreviews = [];
  form.tags = [];
  form.pricedBy = 'weight';
  form.unitPriceYuan = 10;
  form.estimatedWeightGrams = 500;
  form.initialStockJin = 0;
  form.deliveryMethods = ['self_pickup'];
  form.priceDisplayRule = 'starting';
  form.skus = [];
  form.saleStatus = 'on_shelf';
  form.hasTraceability = false;
}

function openCreate(): void {
  dialogMode.value = 'create';
  editingId.value = '';
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row: GroceryProductVo): void {
  dialogMode.value = 'edit';
  editingId.value = row.productId;
  form.categoryId = row.categoryId;
  form.name = row.name;
  form.description = row.description ?? '';
  form.mainImageFileIds = [...(row.mainImageFileIds ?? [])];
  form.mainImagePreviews = [...row.mainImageUrls];
  form.detailImageFileIds = [...(row.detailImageFileIds ?? [])];
  form.detailImagePreviews = [...row.detailImageUrls];
  form.tags = [...(row.tags ?? [])];
  form.pricedBy = row.pricedBy;
  form.unitPriceYuan = Number(yuanFromCents(row.unitPriceCentsPerJin));
  form.estimatedWeightGrams = row.estimatedWeightGrams;
  form.initialStockJin = Number(row.stockJin);
  form.deliveryMethods = [...(row.deliveryMethods ?? [])];
  form.priceDisplayRule = row.priceDisplayRule;
  form.skus = row.skus.map((s) => ({
    skuId: s.skuId,
    specValue: s.specValue,
    priceCents: Number(s.priceCents),
    priceYuan: Number(yuanFromCents(s.priceCents)),
    stockJin: Number(s.stockJin),
    weightGrams: s.weightGrams ?? undefined,
    displayOrder: s.displayOrder,
  }));
  form.saleStatus = row.saleStatus;
  form.hasTraceability = row.hasTraceability === 1;
  dialogVisible.value = true;
}

function showTagInput(): void {
  tagInputVisible.value = true;
  void nextTick(() => tagInputRef.value?.focus?.());
}

function addTag(): void {
  const v = tagInputValue.value.trim();
  if (!v) {
    tagInputVisible.value = false;
    tagInputValue.value = '';
    return;
  }
  if (v.length > GROCERY_LIMITS.tagLen) {
    ElMessage.warning(`标签最长 ${GROCERY_LIMITS.tagLen} 字`);
    return;
  }
  if (form.tags.includes(v)) {
    ElMessage.warning('标签已存在');
    return;
  }
  if (form.tags.length >= GROCERY_LIMITS.tags) {
    ElMessage.warning(`最多 ${GROCERY_LIMITS.tags} 个标签`);
    return;
  }
  form.tags.push(v);
  tagInputValue.value = '';
  tagInputVisible.value = false;
}

function removeTag(t: string): void {
  form.tags = form.tags.filter((x) => x !== t);
}

function addSku(): void {
  if (form.skus.length >= GROCERY_LIMITS.skus) {
    ElMessage.warning(`最多 ${GROCERY_LIMITS.skus} 个规格`);
    return;
  }
  form.skus.push({
    specValue: '',
    priceCents: 0,
    priceYuan: 0,
    stockJin: 0,
    weightGrams: undefined,
    displayOrder: form.skus.length,
  });
}

function removeSku(idx: number): void {
  form.skus.splice(idx, 1);
}

function moveSku(idx: number, dir: -1 | 1): void {
  const target = idx + dir;
  if (target < 0 || target >= form.skus.length) return;
  const a = form.skus[idx]!;
  const b = form.skus[target]!;
  form.skus[idx] = b;
  form.skus[target] = a;
}

const showWeightFields = computed(() => form.pricedBy === 'weight');
const showPieceFields = computed(() => form.pricedBy === 'piece');
const showSkuFields = computed(() => form.pricedBy === 'sku');

function validate(): boolean {
  if (!form.categoryId) {
    ElMessage.error('请选择分类');
    return false;
  }
  if (!form.name.trim()) {
    ElMessage.error('请输入商品标题');
    return false;
  }
  if (form.pricedBy !== 'sku' && form.unitPriceYuan <= 0) {
    ElMessage.error('请填写商品单价');
    return false;
  }
  if (form.pricedBy === 'sku') {
    if (form.skus.length === 0) {
      ElMessage.error('请至少添加一个规格');
      return false;
    }
    for (const s of form.skus) {
      if (!s.specValue.trim()) {
        ElMessage.error('规格名不能为空');
        return false;
      }
      if (s.priceYuan <= 0) {
        ElMessage.error(`规格「${s.specValue}」的售价必须大于 0`);
        return false;
      }
      if (s.stockJin < 0) {
        ElMessage.error(`规格「${s.specValue}」的库存不能为负`);
        return false;
      }
    }
    const set = new Set<string>();
    for (const s of form.skus) {
      const k = s.specValue.trim();
      if (set.has(k)) {
        ElMessage.error(`规格名重复:${k}`);
        return false;
      }
      set.add(k);
    }
  }
  if (form.mainImageFileIds.length > GROCERY_LIMITS.mainImages) {
    ElMessage.error(`主图最多 ${GROCERY_LIMITS.mainImages} 张`);
    return false;
  }
  if (form.detailImageFileIds.length > GROCERY_LIMITS.detailImages) {
    ElMessage.error(`详情图最多 ${GROCERY_LIMITS.detailImages} 张`);
    return false;
  }
  return true;
}

function buildPayload(): CreateGroceryProductReq {
  const unitPriceCentsPerJin = form.pricedBy === 'sku' ? 0 : Math.round(form.unitPriceYuan * 100);
  const payload: CreateGroceryProductReq = {
    categoryId: form.categoryId,
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    mainImageFileIds: form.mainImageFileIds,
    detailImageFileIds: form.detailImageFileIds,
    tags: form.tags,
    pricedBy: form.pricedBy,
    unitPriceCentsPerJin,
    estimatedWeightGrams: form.estimatedWeightGrams,
    initialStockJin: form.initialStockJin,
    deliveryMethods: form.deliveryMethods,
    priceDisplayRule: form.priceDisplayRule,
    saleStatus: form.saleStatus,
    hasTraceability: form.hasTraceability,
  };
  if (form.pricedBy === 'sku') {
    payload.skus = form.skus.map((s, idx) => ({
      skuId: s.skuId,
      specValue: s.specValue.trim(),
      priceCents: Math.round(s.priceYuan * 100),
      stockJin: s.stockJin,
      weightGrams: s.weightGrams,
      displayOrder: idx,
    }));
  }
  return payload;
}

async function submit(): Promise<void> {
  if (!validate()) return;
  const payload = buildPayload();
  if (dialogMode.value === 'create') {
    const r = await createGroceryProduct(payload);
    if (r.code === '0') {
      ElMessage.success('创建成功');
      dialogVisible.value = false;
      void fetchList();
    } else {
      ElMessage.error(r.message ?? '创建失败');
    }
  } else {
    const r = await updateGroceryProduct(editingId.value, payload);
    if (r.code === '0') {
      ElMessage.success('更新成功');
      dialogVisible.value = false;
      void fetchList();
    } else {
      ElMessage.error(r.message ?? '更新失败');
    }
  }
}

async function onToggleShelf(row: GroceryProductVo): Promise<void> {
  const target = row.saleStatus === 'on_shelf' ? 'off_shelf' : 'on_shelf';
  await ElMessageBox.confirm(`确定${target === 'on_shelf' ? '上架' : '下架'}「${row.name}」?`, '确认操作', {
    type: 'warning',
  });
  const r = await shelfGroceryProduct(row.productId, target);
  if (r.code === '0') {
    ElMessage.success('已操作');
    void fetchList();
  } else {
    ElMessage.error(r.message ?? '操作失败');
  }
}

function openStock(row: GroceryProductVo): void {
  if (row.pricedBy === 'sku') {
    ElMessage.warning('规格商品请在「编辑」中调整各 SKU 库存');
    return;
  }
  stockTarget.value = row;
  stockDelta.value = 0;
  stockReason.value = '';
  stockDialog.value = true;
}

async function submitStock(): Promise<void> {
  if (!stockTarget.value || stockDelta.value === 0) {
    ElMessage.error('请输入非零数量(正=入库,负=出库)');
    return;
  }
  const r = await adjustGroceryProductStock(
    stockTarget.value.productId,
    stockDelta.value,
    stockReason.value || undefined,
  );
  if (r.code === '0') {
    ElMessage.success('库存已调整');
    stockDialog.value = false;
    void fetchList();
  } else {
    ElMessage.error(r.message ?? '调整失败');
  }
}

function openCatDialog(): void {
  newCatName.value = '';
  catDialog.value = true;
}

async function submitCat(): Promise<void> {
  if (!newCatName.value.trim()) {
    ElMessage.error('分类名必填');
    return;
  }
  const r = await createGroceryCategory({ name: newCatName.value.trim() });
  if (r.code === '0') {
    ElMessage.success('分类已创建');
    catDialog.value = false;
    await fetchCategories();
    void fetchList();
  } else {
    ElMessage.error(r.message ?? '创建失败');
  }
}

onMounted(async () => {
  await fetchCategories();
  void fetchList();
});
</script>

<template>
  <div class="page">
    <el-card>
      <div class="toolbar">
        <el-input v-model="query.keyword" placeholder="按商品名搜索" clearable style="width: 220px" />
        <el-select v-model="query.categoryId" placeholder="分类" clearable style="width: 160px">
          <el-option v-for="c in categories" :key="c.categoryId" :label="c.name" :value="c.categoryId" />
        </el-select>
        <el-select v-model="query.saleStatus" placeholder="状态" clearable style="width: 140px">
          <el-option label="在售" value="on_shelf" />
          <el-option label="已下架" value="off_shelf" />
          <el-option label="已售罄" value="sold_out" />
        </el-select>
        <el-button type="primary" @click="((query.pageNo = 1), fetchList())">搜索</el-button>
        <el-button v-if="canWrite()" type="success" @click="openCreate">新增商品</el-button>
        <el-button v-if="canWrite()" @click="openCatDialog">新增分类</el-button>
      </div>

      <el-table v-loading="loading" :data="list" style="margin-top: 16px">
        <el-table-column label="图" width="76">
          <template #default="{ row }">
            <el-image
              v-if="thumbOf(row)"
              :src="thumbOf(row)"
              fit="cover"
              style="width: 56px; height: 56px; border-radius: 8px"
              :preview-src-list="
                row.mainImageUrls?.length ? row.mainImageUrls : row.coverImageUrl ? [row.coverImageUrl] : []
              "
              hide-on-click-modal
              preview-teleported
            />
            <span v-else style="color: #cbd5e1; font-size: 12px">无图</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="商品名" min-width="180">
          <template #default="{ row }">
            <div style="font-weight: 600">{{ row.name }}</div>
            <div v-if="row.tags?.length" style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px">
              <el-tag v-for="t in row.tags" :key="t" size="small" type="info" effect="plain">{{ t }}</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="120">
          <template #default="{ row }">{{ categoryNames[row.categoryId] ?? row.categoryId }}</template>
        </el-table-column>
        <el-table-column label="定价模式" width="110">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ GROCERY_PRICED_BY_LABELS[row.pricedBy as GroceryPricedBy] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="价格" width="170">
          <template #default="{ row }">
            <span style="color: #ff4d4f; font-weight: 700">{{ priceCellOf(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="库存" width="160">
          <template #default="{ row }">{{ stockCellOf(row) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.saleStatus === 'on_shelf' ? 'success' : row.saleStatus === 'sold_out' ? 'warning' : 'info'"
            >
              {{ statusLabel[row.saleStatus as ProductSaleStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="溯源" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.hasTraceability === 1" type="warning" effect="plain" size="small">一鸡一码</el-tag>
            <span v-else style="color: #94a3b8; font-size: 12px">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :disabled="!canWrite()" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" :disabled="!canWrite() || row.pricedBy === 'sku'" @click="openStock(row)"
              >调库存</el-button
            >
            <el-button
              size="small"
              :type="row.saleStatus === 'on_shelf' ? 'warning' : 'primary'"
              :disabled="!canWrite()"
              @click="onToggleShelf(row)"
              >{{ row.saleStatus === 'on_shelf' ? '下架' : '上架' }}</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="query.pageNo"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        background
        layout="total, sizes, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @current-change="fetchList"
        @size-change="fetchList"
      />
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增生鲜商品' : '编辑生鲜商品'"
      width="880px"
      top="6vh"
    >
      <el-form :model="form" label-width="110px" label-position="right">
        <el-divider content-position="left">基础信息</el-divider>
        <el-form-item label="商品分类" required>
          <el-select v-model="form.categoryId" placeholder="选择分类" style="width: 100%">
            <el-option v-for="c in categories" :key="c.categoryId" :label="c.name" :value="c.categoryId" />
          </el-select>
        </el-form-item>
        <el-form-item label="商品标题" required>
          <el-input v-model="form.name" placeholder="例如:云南黄瓜 / 散养土鸡" :maxlength="64" show-word-limit />
        </el-form-item>
        <el-form-item label="商品简介">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            :maxlength="200"
            show-word-limit
            placeholder="一句话描述,例如:密植黄瓜,口感脆嫩"
          />
        </el-form-item>

        <el-divider content-position="left">商品标签</el-divider>
        <el-form-item label="商品标签">
          <div class="tags-row">
            <el-tag
              v-for="t in form.tags"
              :key="t"
              closable
              :disable-transitions="false"
              type="primary"
              effect="plain"
              @close="removeTag(t)"
              >{{ t }}</el-tag
            >
            <el-input
              v-if="tagInputVisible"
              ref="tagInputRef"
              v-model="tagInputValue"
              size="small"
              style="width: 110px"
              :maxlength="GROCERY_LIMITS.tagLen"
              @keyup.enter="addTag"
              @blur="addTag"
            />
            <el-button v-else size="small" plain @click="showTagInput">+ 添加标签</el-button>
          </div>
          <div class="form-tip">最多 {{ GROCERY_LIMITS.tags }} 个,每个 ≤ {{ GROCERY_LIMITS.tagLen }} 字</div>
        </el-form-item>

        <el-divider content-position="left">媒体素材</el-divider>
        <el-form-item label="主图">
          <MultiImageUpload
            v-model="form.mainImageFileIds"
            :previews="form.mainImagePreviews"
            :max="GROCERY_LIMITS.mainImages"
            biz-type="grocery-image"
            tip="第一张作为列表/详情封面;最多 10 张"
          />
        </el-form-item>
        <el-form-item label="详情图">
          <MultiImageUpload
            v-model="form.detailImageFileIds"
            :previews="form.detailImagePreviews"
            :max="GROCERY_LIMITS.detailImages"
            biz-type="grocery-image"
            tip="按顺序展示在详情页底部,最多 20 张"
          />
        </el-form-item>

        <el-divider content-position="left">定价与库存</el-divider>
        <el-form-item label="定价模式">
          <el-radio-group v-model="form.pricedBy">
            <el-radio-button v-for="(label, key) in GROCERY_PRICED_BY_LABELS" :key="key" :value="key">{{
              label
            }}</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <template v-if="showWeightFields">
          <el-form-item label="单价(元/斤)" required>
            <el-input-number v-model="form.unitPriceYuan" :min="0.01" :precision="2" :step="0.5" style="width: 200px" />
          </el-form-item>
          <el-form-item label="每份预估">
            <el-input-number
              v-model="form.estimatedWeightGrams"
              :min="50"
              :max="50000"
              :step="50"
              style="width: 200px"
            />
            <span style="margin-left: 8px; color: #94a3b8"
              >克 ≈ {{ (form.estimatedWeightGrams / 500).toFixed(2) }} 斤</span
            >
          </el-form-item>
          <el-form-item v-if="dialogMode === 'create'" label="初始库存(斤)">
            <el-input-number v-model="form.initialStockJin" :min="0" :step="10" style="width: 200px" />
          </el-form-item>
        </template>

        <template v-if="showPieceFields">
          <el-form-item label="单价(元/件)" required>
            <el-input-number v-model="form.unitPriceYuan" :min="0.01" :precision="2" :step="1" style="width: 200px" />
          </el-form-item>
          <el-form-item v-if="dialogMode === 'create'" label="初始库存(件)">
            <el-input-number v-model="form.initialStockJin" :min="0" :step="1" style="width: 200px" />
          </el-form-item>
        </template>

        <template v-if="showSkuFields">
          <el-form-item label="规格 SKU">
            <div style="width: 100%">
              <el-table :data="form.skus" border size="small" style="width: 100%">
                <el-table-column label="#" width="50">
                  <template #default="{ $index }">{{ $index + 1 }}</template>
                </el-table-column>
                <el-table-column label="规格名" min-width="150">
                  <template #default="{ row }">
                    <el-input v-model="row.specValue" placeholder="如 500g 装 / 整鸡" :maxlength="64" />
                  </template>
                </el-table-column>
                <el-table-column label="售价(元)" width="140">
                  <template #default="{ row }">
                    <el-input-number
                      v-model="row.priceYuan"
                      :min="0.01"
                      :precision="2"
                      :step="0.5"
                      :controls="false"
                      style="width: 100%"
                    />
                  </template>
                </el-table-column>
                <el-table-column label="库存" width="120">
                  <template #default="{ row }">
                    <el-input-number v-model="row.stockJin" :min="0" :step="1" :controls="false" style="width: 100%" />
                  </template>
                </el-table-column>
                <el-table-column label="参考克数" width="120">
                  <template #default="{ row }">
                    <el-input-number
                      v-model="row.weightGrams"
                      :min="0"
                      :step="50"
                      :controls="false"
                      placeholder="选填"
                      style="width: 100%"
                    />
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="140" fixed="right">
                  <template #default="{ $index }">
                    <el-button size="small" link :disabled="$index === 0" @click="moveSku($index, -1)">↑</el-button>
                    <el-button size="small" link :disabled="$index === form.skus.length - 1" @click="moveSku($index, 1)"
                      >↓</el-button
                    >
                    <el-button size="small" type="danger" link @click="removeSku($index)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <el-button
                type="primary"
                plain
                size="small"
                style="margin-top: 8px"
                :disabled="form.skus.length >= GROCERY_LIMITS.skus"
                @click="addSku"
                >+ 新增规格</el-button
              >
              <div class="form-tip">至少 1 条,最多 {{ GROCERY_LIMITS.skus }} 条;售价/库存按 SKU 独立维护</div>
            </div>
          </el-form-item>
        </template>

        <el-divider content-position="left">物流与展示</el-divider>
        <el-form-item label="物流方式">
          <el-checkbox-group v-model="form.deliveryMethods">
            <el-checkbox v-for="(label, key) in GROCERY_DELIVERY_METHOD_LABELS" :key="key" :value="key">{{
              label
            }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="价格显示规则">
          <el-radio-group v-model="form.priceDisplayRule">
            <el-radio v-for="(label, key) in GROCERY_PRICE_DISPLAY_RULE_LABELS" :key="key" :value="key">{{
              label
            }}</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-divider content-position="left">上下架与溯源</el-divider>
        <el-form-item label="状态">
          <el-radio-group v-model="form.saleStatus">
            <el-radio value="on_shelf">在售</el-radio>
            <el-radio value="off_shelf">下架</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="一鸡一码溯源">
          <el-switch v-model="form.hasTraceability" />
          <span style="margin-left: 12px; color: #94a3b8">开启后:售出时必须扫已绑档案的二维码</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="stockDialog" title="调整库存" width="480px">
      <p v-if="stockTarget" style="color: #5a6275">
        商品:<b>{{ stockTarget.name }}</b
        >,当前库存 <b>{{ Number(stockTarget.stockJin).toFixed(2) }}</b>
      </p>
      <el-form label-width="80px">
        <el-form-item label="变动量">
          <el-input-number v-model="stockDelta" :step="1" style="width: 200px" />
          <span style="margin-left: 8px; color: #94a3b8">正=入库,负=出库</span>
        </el-form-item>
        <el-form-item label="原因">
          <el-input v-model="stockReason" placeholder="选填,如:采购入库 / 损耗" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stockDialog = false">取消</el-button>
        <el-button type="primary" @click="submitStock">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="catDialog" title="新增分类" width="420px">
      <el-form label-width="80px">
        <el-form-item label="分类名">
          <el-input v-model="newCatName" placeholder="例如:禽类 / 蔬菜 / 水果" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="catDialog = false">取消</el-button>
        <el-button type="primary" @click="submitCat">确定</el-button>
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
.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.form-tip {
  margin-top: 6px;
  font-size: 12px;
  color: var(--fg-muted, #94a3b8);
}
</style>
