<script setup lang="ts">
/**
 * 生鲜商品 — 新建 / 编辑
 *  - fixed:售价(分/份) + 库存(份)
 *  - weighed:每斤价(分) + 重量单位 + min/maxWeightG + 库存(份;锁定时按预估克数 × 件数)
 *  - 封面图通过 /pub/files/upload 上传
 */
import { onLoad } from '@dcloudio/uni-app';
import { computed, onMounted, ref } from 'vue';

import { listCategories, type CategoryVo, uploadFile } from '@/api';
import {
  createGroceryProduct,
  type GroceryPricingMode,
  type GroceryProductItemVo,
  type GroceryWeightUnit,
  updateGroceryProduct,
  type UpsertGroceryProductReq,
} from '@/api/grocery';
import SvgIcon from '@/components/common/SvgIcon.vue';

const productId = ref<string>('');
const isEdit = computed(() => !!productId.value);

const categories = ref<CategoryVo[]>([]);
const categoryId = ref('');
const name = ref('');
const description = ref('');
const pricingMode = ref<GroceryPricingMode>('fixed');

// fixed
const priceCents = ref(1000);

// weighed
const unitPricePerJinCents = ref(500);
const weightUnit = ref<GroceryWeightUnit>('jin');
const minWeightG = ref(250);
const maxWeightG = ref(2500);

const stock = ref(100);

const coverFileId = ref('');
const coverUrl = ref('');
const uploading = ref(false);
const submitting = ref(false);

const priceYuan = computed({
  get: () => (priceCents.value / 100).toFixed(2),
  set: (v: string) => {
    priceCents.value = Math.max(0, Math.round(Number(v) * 100));
  },
});

const unitPriceYuan = computed({
  get: () => (unitPricePerJinCents.value / 100).toFixed(2),
  set: (v: string) => {
    unitPricePerJinCents.value = Math.max(0, Math.round(Number(v) * 100));
  },
});

const canSubmit = computed(() => {
  if (!categoryId.value || !name.value.trim() || stock.value < 0) return false;
  if (pricingMode.value === 'fixed') return priceCents.value > 0;
  return unitPricePerJinCents.value > 0 && minWeightG.value > 0 && maxWeightG.value >= minWeightG.value;
});

onLoad((opts) => {
  const pid = (opts?.productId as string) ?? '';
  if (pid) {
    productId.value = pid;
    hydrateFromStash();
  }
});

onMounted(() => {
  void loadCategories();
});

async function loadCategories(): Promise<void> {
  const r = await listCategories();
  if (r.code === '0' && r.data) {
    categories.value = r.data;
    if (!categoryId.value && categories.value[0]) categoryId.value = categories.value[0].categoryId;
  }
}

function hydrateFromStash(): void {
  try {
    const raw = uni.getStorageSync(`o2o:m:grocery:product:${productId.value}`);
    if (!raw || typeof raw !== 'string') return;
    const p = JSON.parse(raw) as GroceryProductItemVo;
    categoryId.value = p.categoryId;
    name.value = p.name;
    pricingMode.value = p.pricingMode;
    stock.value = p.stock;
    coverFileId.value = p.coverImageFileId ?? '';
    if (p.pricingMode === 'fixed') {
      priceCents.value = Number(p.price ?? 0);
    } else {
      unitPricePerJinCents.value = Number(p.unitPricePerJin ?? 0);
      weightUnit.value = p.weightUnit ?? 'jin';
      minWeightG.value = p.minWeightG ?? 250;
      maxWeightG.value = p.maxWeightG ?? 2500;
    }
  } catch {
    // 容忍
  }
}

function pickCover(): void {
  uni.chooseImage({
    count: 1,
    success: async (res) => {
      const fp = res.tempFilePaths?.[0];
      if (!fp) return;
      uploading.value = true;
      try {
        const r = await uploadFile(fp, 'grocery-product-cover');
        if (r.code === '0' && r.data) {
          coverFileId.value = r.data.fileId;
          coverUrl.value = r.data.url;
          uni.showToast({ title: '封面已上传', icon: 'success' });
        }
      } finally {
        uploading.value = false;
      }
    },
  });
}

function pricingModeTap(m: GroceryPricingMode): void {
  pricingMode.value = m;
}

function unitTap(u: GroceryWeightUnit): void {
  weightUnit.value = u;
}

function catTap(c: string): void {
  categoryId.value = c;
}

/** 模板用:从 input event 取 value(规避 uni-app 与 dom Event 类型不一致) */
function inputValue(e: Event): string {
  return (e as unknown as { detail: { value: string } }).detail?.value ?? '';
}

function setPriceYuan(e: Event): void {
  priceYuan.value = inputValue(e);
}
function setUnitPriceYuan(e: Event): void {
  unitPriceYuan.value = inputValue(e);
}
function setMinWeight(e: Event): void {
  minWeightG.value = Math.max(1, Number(inputValue(e)) || 0);
}
function setMaxWeight(e: Event): void {
  maxWeightG.value = Math.max(1, Number(inputValue(e)) || 0);
}
function setStock(e: Event): void {
  stock.value = Math.max(0, Number(inputValue(e)) || 0);
}

async function onSubmit(): Promise<void> {
  if (!canSubmit.value || submitting.value) return;
  submitting.value = true;
  const body: UpsertGroceryProductReq = {
    categoryId: categoryId.value,
    name: name.value.trim(),
    pricingMode: pricingMode.value,
    stock: stock.value,
  };
  if (description.value.trim()) body.description = description.value.trim();
  if (coverFileId.value) body.coverImageFileId = coverFileId.value;
  if (pricingMode.value === 'fixed') {
    body.price = priceCents.value;
  } else {
    body.unitPricePerJin = unitPricePerJinCents.value;
    body.weightUnit = weightUnit.value;
    body.minWeightG = minWeightG.value;
    body.maxWeightG = maxWeightG.value;
  }
  try {
    const r = isEdit.value ? await updateGroceryProduct(productId.value, body) : await createGroceryProduct(body);
    if (r.code === '0') {
      uni.showToast({ title: isEdit.value ? '已保存' : '已创建', icon: 'success' });
      setTimeout(() => uni.navigateBack({ delta: 1 }), 600);
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="pe">
    <view class="pe__head">
      <text class="pe__title">{{ isEdit ? '编辑生鲜商品' : '新建生鲜商品' }}</text>
    </view>

    <!-- 模式切换 -->
    <view class="pe__panel">
      <view class="pe__panel-head">
        <view class="pe__panel-bar" />
        <text class="pe__panel-title">计价方式</text>
      </view>
      <view class="pe__modes">
        <view class="pe__mode" :class="{ 'pe__mode--active': pricingMode === 'fixed' }" @tap="pricingModeTap('fixed')">
          <text class="pe__mode-name">定价(份)</text>
          <text class="pe__mode-desc">按份卖,客户下单即确定金额</text>
        </view>
        <view
          class="pe__mode"
          :class="{ 'pe__mode--active': pricingMode === 'weighed' }"
          @tap="pricingModeTap('weighed')"
        >
          <text class="pe__mode-name">称重(每斤)</text>
          <text class="pe__mode-desc">提货时称重,系统按实重结算</text>
        </view>
      </view>
    </view>

    <!-- 基本信息 -->
    <view class="pe__panel">
      <view class="pe__panel-head">
        <view class="pe__panel-bar" />
        <text class="pe__panel-title">基本信息</text>
      </view>

      <view class="pe__field">
        <text class="pe__label">商品分类</text>
        <view class="pe__cats">
          <view
            v-for="c in categories"
            :key="c.categoryId"
            class="pe__cat"
            :class="{ 'pe__cat--active': categoryId === c.categoryId }"
            @tap="catTap(c.categoryId)"
          >
            {{ c.name }}
          </view>
        </view>
      </view>

      <view class="pe__field">
        <text class="pe__label">商品名称</text>
        <input class="pe__input" v-model="name" placeholder="如:有机西红柿" maxlength="64" />
      </view>

      <view class="pe__field">
        <text class="pe__label">商品描述</text>
        <textarea class="pe__textarea" v-model="description" placeholder="选填" maxlength="500" />
      </view>

      <view class="pe__field">
        <text class="pe__label">封面图</text>
        <view class="pe__cover" @tap="pickCover">
          <image v-if="coverUrl" class="pe__cover-img" :src="coverUrl" mode="aspectFill" />
          <view v-else class="pe__cover-placeholder">
            <SvgIcon name="plus" :size="32" color="#b7791f" />
            <text>{{ uploading ? '上传中…' : '点击上传封面' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 价格 / 库存 -->
    <view class="pe__panel">
      <view class="pe__panel-head">
        <view class="pe__panel-bar" />
        <text class="pe__panel-title">价格与库存</text>
      </view>

      <!-- fixed -->
      <view v-if="pricingMode === 'fixed'" class="pe__field">
        <text class="pe__label">售价(元/份)</text>
        <view class="pe__inline">
          <text class="pe__inline-prefix">¥</text>
          <input class="pe__input" type="digit" :value="priceYuan" @input="setPriceYuan" />
        </view>
      </view>

      <!-- weighed -->
      <template v-else>
        <view class="pe__field">
          <text class="pe__label">每斤价(元)</text>
          <view class="pe__inline">
            <text class="pe__inline-prefix">¥</text>
            <input class="pe__input" type="digit" :value="unitPriceYuan" @input="setUnitPriceYuan" />
            <text class="pe__inline-suffix">/斤</text>
          </view>
        </view>

        <view class="pe__field">
          <text class="pe__label">显示单位</text>
          <view class="pe__units">
            <view class="pe__unit" :class="{ 'pe__unit--active': weightUnit === 'jin' }" @tap="unitTap('jin')">斤</view>
            <view class="pe__unit" :class="{ 'pe__unit--active': weightUnit === 'kg' }" @tap="unitTap('kg')">公斤</view>
            <view class="pe__unit" :class="{ 'pe__unit--active': weightUnit === 'g' }" @tap="unitTap('g')">克</view>
          </view>
        </view>

        <view class="pe__field">
          <text class="pe__label">最小预估重量(g)</text>
          <input class="pe__input" type="number" :value="minWeightG" @input="setMinWeight" />
        </view>

        <view class="pe__field">
          <text class="pe__label">最大预估重量(g)</text>
          <input class="pe__input" type="number" :value="maxWeightG" @input="setMaxWeight" />
        </view>
      </template>

      <view class="pe__field">
        <text class="pe__label">库存(份)</text>
        <input class="pe__input" type="number" :value="stock" @input="setStock" />
      </view>
    </view>

    <!-- 底部 -->
    <view class="pe__foot">
      <view class="pe__submit" :class="{ 'pe__submit--disabled': !canSubmit || submitting }" @tap="onSubmit">
        <text>{{ submitting ? '提交中…' : isEdit ? '保存修改' : '创建商品' }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.pe {
  min-height: 100vh;
  padding: 24rpx 24rpx 220rpx;
  background: #f5f6f8;
}
.pe__head {
  padding: 4rpx;
}
.pe__title {
  font-size: 36rpx;
  font-weight: 800;
  color: #172033;
}

.pe__panel {
  margin-top: 18rpx;
  padding: 22rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 14rpx;
}
.pe__panel-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 16rpx;
}
.pe__panel-bar {
  width: 6rpx;
  height: 24rpx;
  background: #b7791f;
  border-radius: 2rpx;
}
.pe__panel-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
}

/* 模式选择 */
.pe__modes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
}
.pe__mode {
  padding: 18rpx;
  background: #f7f8fa;
  border: 2rpx solid #e6e9ee;
  border-radius: 10rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.pe__mode--active {
  border-color: #b7791f;
  background: #fff7e0;
}
.pe__mode-name {
  font-size: 26rpx;
  font-weight: 700;
  color: #172033;
}
.pe__mode-desc {
  font-size: 20rpx;
  color: #8a94a6;
  line-height: 1.4;
}

/* 表单字段 */
.pe__field {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding: 14rpx 0;
  border-bottom: 1rpx solid #f0f1f3;
}
.pe__field:last-child {
  border-bottom: none;
}
.pe__label {
  font-size: 24rpx;
  color: #5a6275;
  font-weight: 600;
}
.pe__input {
  padding: 12rpx 14rpx;
  background: #f7f8fa;
  border: 1rpx solid #e6e9ee;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #172033;
}
.pe__textarea {
  padding: 12rpx 14rpx;
  background: #f7f8fa;
  border: 1rpx solid #e6e9ee;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #172033;
  height: 140rpx;
  width: 100%;
  box-sizing: border-box;
}
.pe__inline {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 14rpx;
  background: #f7f8fa;
  border: 1rpx solid #e6e9ee;
  border-radius: 8rpx;
}
.pe__inline .pe__input {
  flex: 1;
  padding: 0;
  background: transparent;
  border: none;
  font-size: 28rpx;
  font-weight: 700;
}
.pe__inline-prefix {
  font-size: 26rpx;
  color: #c0392b;
  font-weight: 700;
}
.pe__inline-suffix {
  font-size: 22rpx;
  color: #8a94a6;
}

/* 分类 / 单位 选择 */
.pe__cats,
.pe__units {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}
.pe__cat,
.pe__unit {
  padding: 10rpx 22rpx;
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #5a6275;
}
.pe__cat--active,
.pe__unit--active {
  background: #b7791f;
  color: #fff;
  border-color: #b7791f;
  font-weight: 700;
}

/* 封面 */
.pe__cover {
  width: 200rpx;
  height: 200rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background: #f7f8fa;
  border: 2rpx dashed #d8dde4;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pe__cover-img {
  width: 100%;
  height: 100%;
}
.pe__cover-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  font-size: 22rpx;
  color: #8a94a6;
}

/* 底部 */
.pe__foot {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
  background: #fff;
  border-top: 1rpx solid #e6e9ee;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
}
.pe__submit {
  padding: 24rpx 0;
  background: #b7791f;
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  text-align: center;
  border-radius: 10rpx;
}
.pe__submit--disabled {
  background: #dde2ea;
  color: #b6bfcd;
}
</style>
