<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { computed, onMounted, ref } from 'vue';

import {
  type CategoryVo,
  createProduct,
  getMerchantProductDetail,
  listCategories,
  type SkuReq,
  updateProduct,
  uploadFile,
} from '@/api';
import SvgIcon from '@/components/common/SvgIcon.vue';

interface SkuRow {
  specValue: string;
  price: number; // 分
  stock: number;
}

const productId = ref<string>('');
const isEdit = computed(() => !!productId.value);

const categories = ref<CategoryVo[]>([]);
const categoryId = ref('');
const name = ref('');
const description = ref('');
const hasSku = ref<0 | 1>(0);
const priceCents = ref(1000);
const stock = ref(10);
const stockAlertThreshold = ref(5);
const skus = ref<SkuRow[]>([]);

// 图片
const coverImageFileId = ref<string>('');
const coverImageUrl = ref<string>('');
const coverUploading = ref(false);
const galleryImages = ref<Array<{ fileId: string; url: string }>>([]);
const galleryUploading = ref(false);

const submitting = ref(false);
const errorMsg = ref('');
const okMsg = ref('');
const detailLoading = ref(false);

const canSubmit = computed(() => {
  if (!categoryId.value || !name.value.trim()) return false;
  if (hasSku.value === 1) return skus.value.length > 0 && skus.value.every((s) => s.specValue && s.price >= 0);
  return priceCents.value > 0 && stock.value >= 0;
});

const priceYuan = computed({
  get: () => (priceCents.value / 100).toFixed(2),
  set: (v: string) => {
    priceCents.value = Math.max(0, Math.round(Number(v) * 100));
  },
});

function skuPriceYuan(s: SkuRow): string {
  return (s.price / 100).toFixed(2);
}
function setSkuPriceYuan(s: SkuRow, v: string): void {
  s.price = Math.max(0, Math.round(Number(v) * 100));
}

async function loadCategories(): Promise<void> {
  const r = await listCategories();
  if (r.code === '0' && r.data) {
    categories.value = r.data;
    if (!categoryId.value && categories.value[0]) categoryId.value = categories.value[0].categoryId;
  }
}

async function loadDetail(): Promise<void> {
  if (!productId.value) return;
  detailLoading.value = true;
  try {
    const r = await getMerchantProductDetail(productId.value);
    if (r.code === '0' && r.data) {
      const d = r.data;
      categoryId.value = d.categoryId;
      name.value = d.name;
      description.value = d.description ?? '';
      hasSku.value = d.hasSku === 1 ? 1 : 0;
      priceCents.value = Number(d.price) || 0;
      stock.value = d.stock;
      stockAlertThreshold.value = d.stockAlertThreshold;
      coverImageFileId.value = d.coverImageFileId ?? '';
      coverImageUrl.value = d.imageUrl ?? '';
      galleryImages.value = (d.images ?? []).map((id) => ({ fileId: id, url: '' }));
      skus.value = d.skus.map((s) => ({
        specValue: s.specValue,
        price: Number(s.price) || 0,
        stock: s.stock,
      }));
    } else {
      errorMsg.value = r.message || '加载失败';
    }
  } finally {
    detailLoading.value = false;
  }
}

function addSku(): void {
  skus.value.push({ specValue: `规格${skus.value.length + 1}`, price: priceCents.value || 1000, stock: 10 });
}

function removeSku(i: number): void {
  skus.value.splice(i, 1);
}

async function pickAndUpload(): Promise<{ fileId: string; url: string } | null> {
  try {
    const res = await new Promise<UniApp.ChooseImageSuccessCallbackResult>((resolve, reject) => {
      uni.chooseImage({ count: 1, sizeType: ['compressed'], success: resolve, fail: reject });
    });
    const path = res.tempFilePaths?.[0];
    if (!path) return null;
    const r = await uploadFile(path, 'product-image');
    if (r.code !== '0' || !r.data) {
      uni.showToast({ title: r.message || '上传失败', icon: 'none' });
      return null;
    }
    return { fileId: r.data.fileId, url: r.data.url };
  } catch (e) {
    if (e && (e as { errMsg?: string }).errMsg?.includes('cancel')) return null;
    uni.showToast({ title: e instanceof Error ? e.message : '上传失败', icon: 'none' });
    return null;
  }
}

async function pickCover(): Promise<void> {
  if (coverUploading.value) return;
  coverUploading.value = true;
  try {
    const r = await pickAndUpload();
    if (r) {
      coverImageFileId.value = r.fileId;
      coverImageUrl.value = r.url;
    }
  } finally {
    coverUploading.value = false;
  }
}

function removeCover(): void {
  coverImageFileId.value = '';
  coverImageUrl.value = '';
}

async function pickGallery(): Promise<void> {
  if (galleryUploading.value || galleryImages.value.length >= 6) return;
  galleryUploading.value = true;
  try {
    const r = await pickAndUpload();
    if (r) galleryImages.value.push(r);
  } finally {
    galleryUploading.value = false;
  }
}

function removeGallery(i: number): void {
  galleryImages.value.splice(i, 1);
}

async function onSubmit(): Promise<void> {
  errorMsg.value = '';
  okMsg.value = '';
  submitting.value = true;
  try {
    if (isEdit.value) {
      const r = await updateProduct(productId.value, {
        categoryId: categoryId.value,
        name: name.value,
        description: description.value || undefined,
        coverImageFileId: coverImageFileId.value || undefined,
        images: galleryImages.value.length ? galleryImages.value.map((g) => g.fileId) : undefined,
        price: hasSku.value === 0 ? priceCents.value : undefined,
        stock: hasSku.value === 0 ? stock.value : undefined,
        stockAlertThreshold: stockAlertThreshold.value,
      });
      if (r.code !== '0') {
        errorMsg.value = r.message;
        return;
      }
      okMsg.value = '已保存';
      uni.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => uni.navigateBack(), 800);
      return;
    }
    // 新增
    const r = await createProduct({
      categoryId: categoryId.value,
      name: name.value,
      description: description.value || undefined,
      coverImageFileId: coverImageFileId.value || undefined,
      images: galleryImages.value.length ? galleryImages.value.map((g) => g.fileId) : undefined,
      hasSku: hasSku.value,
      price: hasSku.value === 0 ? priceCents.value : undefined,
      stock: hasSku.value === 0 ? stock.value : undefined,
      stockAlertThreshold: stockAlertThreshold.value,
      skus: hasSku.value === 1 ? (skus.value as SkuReq[]) : undefined,
      saleStatus: 'on_shelf',
    });
    if (r.code !== '0') {
      errorMsg.value = r.message;
      return;
    }
    okMsg.value = `已创建,商品 ID:${r.data?.productId}`;
    uni.showToast({ title: '创建成功', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 800);
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '保存失败';
  } finally {
    submitting.value = false;
  }
}

onLoad((options) => {
  productId.value = (options?.productId as string) ?? '';
});

onMounted(async () => {
  await loadCategories();
  if (productId.value) await loadDetail();
});
</script>

<template>
  <view class="edit">
    <view class="edit__hero">
      <text class="edit__title">{{ isEdit ? '编辑商品' : '新增商品' }}</text>
      <text class="edit__sub">{{ isEdit ? `商品 ID: ${productId}` : '填写完整信息后提交,默认上架' }}</text>
    </view>

    <view v-if="detailLoading" class="edit__loading">加载中…</view>

    <template v-else>
      <!-- 封面图 -->
      <view class="edit__card">
        <view class="edit__card-h">封面图</view>
        <view class="edit__cover" @tap="pickCover">
          <image v-if="coverImageUrl" :src="coverImageUrl" class="edit__cover-img" mode="aspectFill" />
          <view v-else class="edit__cover-placeholder">
            <SvgIcon name="image" :size="64" color="#8a94a6" />
            <text class="edit__cover-tip">{{ coverUploading ? '上传中…' : '点击上传封面图' }}</text>
          </view>
          <view v-if="coverImageUrl" class="edit__cover-mask">
            <text class="edit__cover-mask-text">{{ coverUploading ? '上传中…' : '点击替换' }}</text>
          </view>
        </view>
        <view v-if="coverImageUrl" class="edit__cover-remove" @tap="removeCover">删除封面</view>
      </view>

      <!-- 基础信息 -->
      <view class="edit__card">
        <view class="edit__card-h">基础信息</view>

        <view class="edit__field-row">
          <text class="edit__label">分类 *</text>
          <picker
            mode="selector"
            :range="categories.map((c) => c.name)"
            @change="(e: any) => (categoryId = categories[e.detail.value]?.categoryId ?? '')"
          >
            <view class="edit__field-value">
              {{ categories.find((c) => c.categoryId === categoryId)?.name || '请选择分类' }} ›
            </view>
          </picker>
        </view>

        <view class="edit__field-row">
          <text class="edit__label">名称 *</text>
          <input class="edit__field-input" v-model="name" placeholder="如:香辣鸡腿堡" maxlength="128" />
        </view>

        <view class="edit__field-row edit__field-row--col">
          <text class="edit__label">描述</text>
          <textarea
            class="edit__field-textarea"
            v-model="description"
            placeholder="商品介绍 / 配料 / 规格特点"
            maxlength="500"
          />
        </view>
      </view>

      <!-- 规格 / 价格 / 库存 -->
      <view class="edit__card">
        <view class="edit__card-h">规格与价格</view>

        <view class="edit__field-row">
          <text class="edit__label">多规格(SKU)</text>
          <switch :checked="hasSku === 1" :disabled="isEdit" @change="(e: any) => (hasSku = e.detail.value ? 1 : 0)" />
        </view>
        <view v-if="isEdit" class="edit__hint">编辑模式下规格不可切换 / 增删 SKU(避免影响历史订单)</view>

        <template v-if="hasSku === 0">
          <view class="edit__field-row">
            <text class="edit__label">价格(元) *</text>
            <input
              class="edit__field-input"
              type="digit"
              :value="priceYuan"
              @input="(e: any) => (priceYuan = e.detail.value)"
              placeholder="0.00"
            />
          </view>
          <view class="edit__field-row">
            <text class="edit__label">库存 *</text>
            <input class="edit__field-input" type="number" v-model.number="stock" />
          </view>
        </template>

        <template v-else>
          <view v-for="(s, i) in skus" :key="i" class="edit__sku-card">
            <view class="edit__sku-head">
              <text class="edit__sku-idx">规格 {{ i + 1 }}</text>
              <text v-if="!isEdit" class="edit__sku-rm" @tap="removeSku(i)">删除</text>
            </view>
            <view class="edit__sku-row">
              <text class="edit__sku-label">规格名</text>
              <input class="edit__sku-input" v-model="s.specValue" placeholder="如:大杯/小杯,辣/微辣" maxlength="64" />
            </view>
            <view class="edit__sku-row edit__sku-row--split">
              <view class="edit__sku-half">
                <text class="edit__sku-label">价格(元)</text>
                <input
                  class="edit__sku-input"
                  type="digit"
                  :value="skuPriceYuan(s)"
                  @input="(e: any) => setSkuPriceYuan(s, e.detail.value)"
                />
              </view>
              <view class="edit__sku-half">
                <text class="edit__sku-label">库存</text>
                <input class="edit__sku-input" type="number" v-model.number="s.stock" />
              </view>
            </view>
          </view>
          <view v-if="!isEdit" class="edit__sku-add" @tap="addSku">+ 添加规格</view>
        </template>

        <view class="edit__field-row">
          <text class="edit__label">库存预警阈值</text>
          <input class="edit__field-input" type="number" v-model.number="stockAlertThreshold" />
        </view>
      </view>

      <!-- 图集 -->
      <view class="edit__card">
        <view class="edit__card-h">商品图集 ({{ galleryImages.length }}/6)</view>
        <view class="edit__gallery">
          <view v-for="(g, i) in galleryImages" :key="i" class="edit__gallery-item">
            <image v-if="g.url" :src="g.url" class="edit__gallery-img" mode="aspectFill" />
            <view v-else class="edit__gallery-fileid">{{ g.fileId.slice(0, 6) }}…</view>
            <view class="edit__gallery-rm" @tap="removeGallery(i)">×</view>
          </view>
          <view v-if="galleryImages.length < 6" class="edit__gallery-add" @tap="pickGallery">
            <text>{{ galleryUploading ? '上传中…' : '+ 添加图片' }}</text>
          </view>
        </view>
      </view>

      <view v-if="errorMsg" class="edit__msg edit__msg--err">{{ errorMsg }}</view>
      <view v-if="okMsg" class="edit__msg edit__msg--ok">{{ okMsg }}</view>

      <!-- 底部提交 -->
      <view class="edit__bottom">
        <view class="edit__btn" :class="{ 'edit__btn--disabled': !canSubmit || submitting }" @tap="onSubmit">
          {{ submitting ? '保存中…' : isEdit ? '保存修改' : '创建商品' }}
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.edit {
  min-height: 100vh;
  padding: 20rpx 20rpx 200rpx;
  background: #f5f6f8;
}
.edit__hero {
  background: linear-gradient(135deg, #1f2937, #b7791f);
  color: #fff;
  border-radius: 24rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 16rpx;
}
.edit__title {
  display: block;
  font-size: 36rpx;
  font-weight: 800;
}
.edit__sub {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.84);
}
.edit__loading {
  text-align: center;
  padding: 80rpx 0;
  color: #8a94a6;
}

.edit__card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 6rpx 18rpx rgba(31, 41, 55, 0.04);
}
.edit__card-h {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
  margin-bottom: 16rpx;
}

/* 封面图 */
.edit__cover {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 16rpx;
  background: #f0f1f3;
  border: 2rpx dashed #c5c9d2;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.edit__cover-img {
  width: 100%;
  height: 100%;
}
.edit__cover-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  color: #8a94a6;
}
.edit__cover-icon {
  font-size: 64rpx;
}
.edit__cover-tip {
  font-size: 24rpx;
}
.edit__cover-mask {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  text-align: center;
  padding: 10rpx;
  font-size: 22rpx;
}
.edit__cover-mask-text {
  color: #fff;
}
.edit__cover-remove {
  margin-top: 12rpx;
  text-align: center;
  font-size: 24rpx;
  color: #d33;
}

/* field row */
.edit__field-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.05);
}
.edit__field-row:last-child {
  border-bottom: 0;
}
.edit__field-row--col {
  flex-direction: column;
  align-items: stretch;
  gap: 8rpx;
}
.edit__label {
  font-size: 26rpx;
  color: #5a6275;
  min-width: 160rpx;
}
.edit__field-value {
  flex: 1;
  font-size: 26rpx;
  color: #172033;
  text-align: right;
}
.edit__field-input {
  flex: 1;
  font-size: 26rpx;
  color: #172033;
  text-align: right;
  padding: 8rpx 0;
}
.edit__field-textarea {
  width: 100%;
  min-height: 120rpx;
  padding: 12rpx;
  font-size: 26rpx;
  background: #f5f6f8;
  border-radius: 12rpx;
  box-sizing: border-box;
}
.edit__hint {
  font-size: 22rpx;
  color: #8a94a6;
  margin: -8rpx 0 12rpx;
}

/* SKU */
.edit__sku-card {
  background: #f5f6f8;
  padding: 18rpx;
  border-radius: 16rpx;
  margin-bottom: 12rpx;
}
.edit__sku-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}
.edit__sku-idx {
  font-size: 24rpx;
  font-weight: 700;
  color: #b7791f;
}
.edit__sku-rm {
  font-size: 22rpx;
  color: #d33;
}
.edit__sku-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 8rpx 0;
}
.edit__sku-row--split {
  gap: 16rpx;
}
.edit__sku-half {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.edit__sku-label {
  font-size: 22rpx;
  color: #5a6275;
  min-width: 100rpx;
}
.edit__sku-input {
  flex: 1;
  font-size: 24rpx;
  background: #fff;
  border-radius: 8rpx;
  padding: 8rpx 12rpx;
}
.edit__sku-add {
  text-align: center;
  padding: 18rpx;
  border: 2rpx dashed #b7791f;
  border-radius: 12rpx;
  color: #b7791f;
  font-size: 24rpx;
  font-weight: 600;
  margin-top: 8rpx;
}

/* gallery */
.edit__gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.edit__gallery-item,
.edit__gallery-add {
  position: relative;
  width: calc((100% - 24rpx) / 3);
  aspect-ratio: 1;
  border-radius: 12rpx;
  overflow: hidden;
}
.edit__gallery-item {
  background: #f0f1f3;
}
.edit__gallery-img {
  width: 100%;
  height: 100%;
}
.edit__gallery-fileid {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  color: #8a94a6;
}
.edit__gallery-rm {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 28rpx;
  text-align: center;
  line-height: 36rpx;
}
.edit__gallery-add {
  border: 2rpx dashed #c5c9d2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  color: #8a94a6;
}

/* 提交栏 */
.edit__msg {
  text-align: center;
  margin: 12rpx 0;
  font-size: 24rpx;
}
.edit__msg--err {
  color: #d33;
}
.edit__msg--ok {
  color: #1e8e3e;
}
.edit__bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16rpx 24rpx 32rpx;
  background: #fff;
  box-shadow: 0 -8rpx 24rpx rgba(31, 41, 55, 0.08);
}
.edit__btn {
  background: linear-gradient(135deg, #ffb400, #b7791f);
  color: #fff;
  border-radius: 999rpx;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 30rpx;
  font-weight: 800;
  text-align: center;
  box-shadow: 0 12rpx 24rpx rgba(183, 121, 31, 0.32);
}
.edit__btn--disabled {
  background: #c5c9d2;
  box-shadow: none;
  color: #fff;
}
</style>
