<script setup lang="ts">
import { onMounted, ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';

const manualCode = ref('');
const manualSig = ref('');
const scanning = ref(false);

function parseTraceUrl(result: string): { code: string; sig: string } | null {
  if (!result) return null;
  try {
    const url = new URL(result);
    const code = url.searchParams.get('code');
    const sig = url.searchParams.get('sig');
    if (code && sig) return { code, sig };
  } catch {
    /* not a URL, fall through */
  }
  const m = result.match(/[?&]code=([^&]+)/);
  const s = result.match(/[?&]sig=([^&]+)/);
  if (m && s && m[1] && s[1]) return { code: decodeURIComponent(m[1]), sig: decodeURIComponent(s[1]) };
  return null;
}

async function startScan(): Promise<void> {
  if (scanning.value) return;
  scanning.value = true;
  try {
    const res = await new Promise<{ result: string }>((resolve, reject) => {
      uni.scanCode({ onlyFromCamera: false, scanType: ['qrCode'], success: resolve, fail: reject });
    });
    const parsed = parseTraceUrl(res.result);
    if (!parsed) {
      uni.showModal({ title: '无法识别', content: '该二维码不是溯源码', showCancel: false });
      return;
    }
    uni.navigateTo({
      url: `/pages/trace/detail?code=${encodeURIComponent(parsed.code)}&sig=${encodeURIComponent(parsed.sig)}`,
    });
  } catch (e) {
    uni.showToast({ title: '取消扫码', icon: 'none' });
  } finally {
    scanning.value = false;
  }
}

function onManualSubmit(): void {
  if (!manualCode.value || !manualSig.value) {
    uni.showToast({ title: '请填写 code 和 sig', icon: 'none' });
    return;
  }
  uni.navigateTo({
    url: `/pages/trace/detail?code=${encodeURIComponent(manualCode.value)}&sig=${encodeURIComponent(manualSig.value)}`,
  });
}

onMounted(() => {
  // H5 端可能没 scanCode 能力,允许手动输入
});
</script>

<template>
  <view class="page">
    <view class="hero">
      <text class="hero__eyebrow">Trace · 扫码溯源</text>
      <text class="hero__title">扫一扫商品二维码</text>
      <text class="hero__sub">查看产地、加工、检测、物流全链路</text>
    </view>

    <view class="scan-card">
      <view class="scan-card__visual">
        <SvgIcon name="radio-tower" :size="120" color="#11998e" />
      </view>
      <button class="scan-card__btn" :disabled="scanning" @tap="startScan">
        {{ scanning ? '调用扫码中...' : '开始扫一扫' }}
      </button>
      <text class="scan-card__hint">支持商品包装上的溯源二维码 / 自定义 URL</text>
    </view>

    <view class="manual">
      <text class="manual__title">手动输入(H5 / 调试用)</text>
      <view class="manual__row">
        <text class="manual__label">QR Code</text>
        <input v-model="manualCode" class="manual__input" placeholder="qrCode" />
      </view>
      <view class="manual__row">
        <text class="manual__label">签名 Sig</text>
        <input v-model="manualSig" class="manual__input" placeholder="shortSig" />
      </view>
      <button class="manual__btn" @tap="onManualSubmit">查询</button>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  background: #fafbfc;
  box-sizing: border-box;
}
.hero {
  padding: 36rpx 30rpx 44rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #11998e, #38ef7d);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  box-shadow: 0 18rpx 48rpx rgba(17, 153, 142, 0.22);
}
.hero__eyebrow {
  font-size: 22rpx;
  letter-spacing: 2rpx;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  align-self: flex-start;
}
.hero__title {
  font-size: 46rpx;
  font-weight: 800;
  margin-top: 16rpx;
}
.hero__sub {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.86);
}

.scan-card {
  margin-top: 24rpx;
  padding: 40rpx 24rpx 32rpx;
  background: #fff;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
  box-shadow: 0 14rpx 32rpx rgba(31, 41, 55, 0.06);
}
.scan-card__visual {
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  background: rgba(17, 153, 142, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.scan-card__btn {
  width: 100%;
  height: 82rpx;
  background: #11998e;
  color: #fff;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 800;
}
.scan-card__hint {
  font-size: 22rpx;
  color: #8a94a6;
}

.manual {
  margin-top: 18rpx;
  padding: 24rpx 26rpx;
  background: #fff;
  border-radius: 22rpx;
  box-shadow: 0 14rpx 32rpx rgba(31, 41, 55, 0.06);
}
.manual__title {
  display: block;
  font-size: 26rpx;
  color: #5a6275;
  font-weight: 700;
  margin-bottom: 14rpx;
}
.manual__row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 0;
}
.manual__label {
  width: 140rpx;
  font-size: 24rpx;
  color: #5a6275;
}
.manual__input {
  flex: 1;
  padding: 12rpx 16rpx;
  background: #f5f6f8;
  border-radius: 12rpx;
  font-size: 24rpx;
}
.manual__btn {
  margin-top: 14rpx;
  width: 100%;
  height: 74rpx;
  background: #172033;
  color: #fff;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 700;
}
</style>
