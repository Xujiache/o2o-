<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { getStore, setBusinessStatus, updateStoreSettings, uploadFile, type StoreVo } from '@/api';
import SvgIcon from '@/components/common/SvgIcon.vue';

const store = ref<StoreVo | null>(null);
const loading = ref(false);
const submitting = ref(false);
const uploading = ref(false);
const switching = ref(false);
const errorMsg = ref('');
const okMsg = ref('');

// 基本信息
const name = ref('');
const intro = ref('');
const notice = ref('');

// 营业参数 — 商家填写元,提交时 ×100 转分(后端用分)
const minOrderYuan = ref(0);
const deliveryFeeYuan = ref(0);

// 封面
const avatarFileId = ref<string | null>(null);
const avatarPreviewUrl = ref<string | null>(null);

const isOnline = computed<boolean>(() => store.value?.businessStatus === 'online');
const isPausedByPlatform = computed<boolean>(() => store.value?.businessStatus === 'paused');

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await getStore();
    if (r.code === '0' && r.data) {
      store.value = r.data;
      name.value = r.data.name;
      intro.value = r.data.intro ?? '';
      minOrderYuan.value = Number(r.data.minOrderAmount) / 100;
      deliveryFeeYuan.value = Number(r.data.deliveryFee) / 100;
      notice.value = r.data.notice ?? '';
      avatarFileId.value = r.data.avatarFileId ?? null;
      avatarPreviewUrl.value = r.data.avatarUrl ?? null;
    }
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function chooseAvatar(): Promise<void> {
  if (uploading.value) return;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  uni.chooseImage?.({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res: any) => {
      const path: string | undefined = res.tempFilePaths?.[0];
      if (!path) return;
      uploading.value = true;
      errorMsg.value = '';
      okMsg.value = '';
      try {
        const r = await uploadFile(path, 'avatar');
        if (r.code === '0' && r.data) {
          avatarFileId.value = r.data.fileId;
          avatarPreviewUrl.value = r.data.url;
          okMsg.value = '封面已上传,记得点保存';
        } else {
          errorMsg.value = r.message || '上传失败';
        }
      } catch (err) {
        errorMsg.value = err instanceof Error ? err.message : '上传失败';
      } finally {
        uploading.value = false;
      }
    },
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

function removeAvatar(): void {
  avatarFileId.value = null;
  avatarPreviewUrl.value = null;
  okMsg.value = '已移除封面,记得点保存';
}

async function toggleBusiness(): Promise<void> {
  if (!store.value || isPausedByPlatform.value || switching.value) return;
  switching.value = true;
  errorMsg.value = '';
  okMsg.value = '';
  try {
    const target = isOnline.value ? 'offline' : 'online';
    const r = await setBusinessStatus({ businessStatus: target });
    if (r.code !== '0') {
      errorMsg.value = r.message || '切换失败';
      return;
    }
    okMsg.value = target === 'online' ? '已开始营业' : '已暂停营业';
    await load();
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '切换失败';
  } finally {
    switching.value = false;
  }
}

function firstChar(s: string): string {
  return s ? s.slice(0, 1) : '店';
}

async function onSubmit(): Promise<void> {
  errorMsg.value = '';
  okMsg.value = '';
  submitting.value = true;
  try {
    const r = await updateStoreSettings({
      name: name.value,
      intro: intro.value,
      minOrderAmount: Math.round(minOrderYuan.value * 100),
      deliveryFee: Math.round(deliveryFeeYuan.value * 100),
      notice: notice.value,
      avatarFileId: avatarFileId.value ?? undefined,
    });
    if (r.code !== '0') {
      errorMsg.value = r.message;
      return;
    }
    okMsg.value = '已保存';
    await load();
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '保存失败';
  } finally {
    submitting.value = false;
  }
}

function gotoDelivery(): void {
  uni.navigateTo({ url: '/pages/store/delivery-area' });
}
</script>

<template>
  <view class="settings">
    <view v-if="loading" class="settings__loading">加载中...</view>

    <template v-else-if="store">
      <!-- 顶部封面 hero(图片占满 + 营业开关浮在右上) -->
      <view class="settings__hero">
        <view class="settings__hero-cover" @tap="chooseAvatar">
          <image v-if="avatarPreviewUrl" :src="avatarPreviewUrl" class="settings__hero-img" mode="aspectFill" />
          <view v-else class="settings__hero-fallback">
            <text class="settings__hero-letter">{{ firstChar(name) }}</text>
          </view>
          <view class="settings__hero-mask">
            <SvgIcon name="image" :size="36" color="#fff" />
            <text class="settings__hero-mask-text">{{ avatarPreviewUrl ? '点击更换封面' : '点击上传店铺封面' }}</text>
          </view>
          <view v-if="uploading" class="settings__hero-loading">上传中…</view>
        </view>

        <view
          class="settings__biz-switch"
          :class="{
            'settings__biz-switch--on': isOnline,
            'settings__biz-switch--off': !isOnline && !isPausedByPlatform,
            'settings__biz-switch--paused': isPausedByPlatform,
          }"
          @tap="toggleBusiness"
        >
          <view v-if="!switching" class="settings__biz-dot" />
          <text class="settings__biz-text">
            {{ switching ? '切换中…' : isPausedByPlatform ? '平台暂停' : isOnline ? '营业中' : '已休业' }}
          </text>
        </view>

        <view v-if="avatarPreviewUrl" class="settings__hero-remove" @tap="removeAvatar">
          <text>移除封面</text>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="settings__section">
        <text class="settings__section-title">基本信息</text>
        <view class="settings__group">
          <view class="settings__field">
            <text class="settings__label">店铺名 <text class="settings__req">*</text></text>
            <input v-model="name" class="settings__input" maxlength="128" placeholder="店铺名称" />
          </view>
          <view class="settings__field settings__field--last">
            <text class="settings__label">店铺简介</text>
            <input v-model="intro" class="settings__input" maxlength="500" placeholder="一句话介绍店铺特色" />
          </view>
        </view>
      </view>

      <!-- 营业参数 -->
      <view class="settings__section">
        <text class="settings__section-title">营业参数</text>
        <view class="settings__group">
          <view class="settings__field">
            <text class="settings__label">起送价 <text class="settings__hint">(元,如 20.00)</text></text>
            <input v-model.number="minOrderYuan" type="digit" class="settings__input" placeholder="如:20" />
          </view>
          <view class="settings__field settings__field--last">
            <text class="settings__label">配送费 <text class="settings__hint">(元,如 3.00)</text></text>
            <input v-model.number="deliveryFeeYuan" type="digit" class="settings__input" placeholder="如:3" />
          </view>
        </view>
        <view class="settings__row" @tap="gotoDelivery">
          <view class="settings__row-icon"><SvgIcon name="motorcycle" :size="32" color="#b7791f" /></view>
          <view class="settings__row-main">
            <text class="settings__row-label">配送范围</text>
            <text class="settings__row-desc">设置外送区域多边形</text>
          </view>
          <text class="settings__row-arrow">›</text>
        </view>
      </view>

      <!-- 公告 -->
      <view class="settings__section">
        <text class="settings__section-title">店铺公告</text>
        <view class="settings__group">
          <view class="settings__field settings__field--last">
            <text class="settings__label">公告内容</text>
            <textarea v-model="notice" class="settings__textarea" maxlength="500" placeholder="今日活动 / 营业提示" />
          </view>
        </view>
      </view>

      <!-- 提示消息 -->
      <view v-if="okMsg" class="settings__msg settings__msg--ok">{{ okMsg }}</view>
      <view v-if="errorMsg" class="settings__msg settings__msg--err">{{ errorMsg }}</view>

      <!-- 底部 fixed 保存按钮 -->
      <view class="settings__bar">
        <button class="settings__cta" :disabled="submitting || uploading" @tap="onSubmit">
          {{ submitting ? '保存中...' : '保存设置' }}
        </button>
      </view>
    </template>
  </view>
</template>

<style scoped>
.settings {
  min-height: 100vh;
  background: #f5f6f8;
  padding-bottom: calc(env(safe-area-inset-bottom, 0rpx) + 200rpx);
}
.settings__loading {
  text-align: center;
  padding: 160rpx 0;
  color: #8a94a6;
  font-size: 26rpx;
}

/* Hero 封面 */
.settings__hero {
  position: relative;
  width: 100%;
}
.settings__hero-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #f5f6f8;
}
.settings__hero-img {
  width: 100%;
  height: 100%;
}
.settings__hero-fallback {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1f2937, #b7791f);
  display: flex;
  align-items: center;
  justify-content: center;
}
.settings__hero-letter {
  font-size: 160rpx;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.96);
}
.settings__hero-mask {
  position: absolute;
  inset: auto 0 0 0;
  padding: 30rpx 28rpx 24rpx;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.6));
  color: #fff;
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.settings__hero-mask-icon {
  font-size: 30rpx;
}
.settings__hero-mask-text {
  font-size: 24rpx;
  font-weight: 600;
}
.settings__hero-loading {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings__biz-switch {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  z-index: 2;
}
.settings__biz-switch--on {
  background: rgba(56, 239, 125, 0.95);
  color: #064f30;
  box-shadow: 0 8rpx 24rpx rgba(56, 239, 125, 0.36);
}
.settings__biz-switch--off {
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
}
.settings__biz-switch--paused {
  background: rgba(255, 77, 79, 0.95);
  color: #fff;
}
.settings__biz-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: currentColor;
}
.settings__biz-text {
  font-size: 22rpx;
  font-weight: 700;
}

.settings__hero-remove {
  position: absolute;
  top: 24rpx;
  left: 24rpx;
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 22rpx;
  z-index: 2;
}

/* Section */
.settings__section {
  margin: 28rpx 24rpx 0;
}
.settings__section-title {
  display: block;
  padding: 0 8rpx 14rpx;
  font-size: 24rpx;
  color: #8a94a6;
  font-weight: 600;
  letter-spacing: 1rpx;
}
.settings__group {
  background: #fff;
  border-radius: 24rpx;
  padding: 8rpx 28rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, 0.05);
}
.settings__field {
  padding: 24rpx 0;
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.06);
}
.settings__field--last {
  border-bottom: none;
}
.settings__label {
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: #5a6275;
  margin-bottom: 12rpx;
}
.settings__req {
  color: #ff4d4f;
  margin-left: 4rpx;
}
.settings__hint {
  color: #c5c9d2;
  font-size: 22rpx;
  margin-left: 6rpx;
}
.settings__input,
.settings__textarea {
  width: 100%;
  min-height: 80rpx;
  padding: 20rpx 24rpx;
  background: #f7f8fa;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #172033;
  box-sizing: border-box;
}
.settings__textarea {
  min-height: 160rpx;
}

/* 配送范围跳转 row */
.settings__row {
  margin-top: 16rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 20rpx 28rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, 0.05);
}
.settings__row-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, rgba(91, 95, 248, 0.12), rgba(0, 184, 217, 0.12));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
}
.settings__row-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}
.settings__row-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #172033;
}
.settings__row-desc {
  font-size: 22rpx;
  color: #8a94a6;
}
.settings__row-arrow {
  color: #c5c9d2;
  font-size: 36rpx;
}

/* 提示 */
.settings__msg {
  margin: 16rpx 24rpx 0;
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  font-size: 24rpx;
}
.settings__msg--ok {
  background: rgba(17, 153, 142, 0.1);
  color: #11998e;
}
.settings__msg--err {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

/* 底部固定保存按钮 */
.settings__bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 24rpx calc(env(safe-area-inset-bottom, 0rpx) + 20rpx);
  background: #f5f6f8;
  border-top: 1rpx solid rgba(31, 41, 55, 0.06);
  z-index: 50;
}
.settings__cta {
  background: linear-gradient(135deg, #1f2937, #b7791f);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: 999rpx;
  padding: 24rpx 0;
  box-shadow: 0 16rpx 36rpx rgba(183, 121, 31, 0.32);
}
.settings__cta[disabled] {
  opacity: 0.6;
}
</style>
