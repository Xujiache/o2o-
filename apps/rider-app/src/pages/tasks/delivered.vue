<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { computed, onMounted, ref } from 'vue';

import { locationService } from '@/services/location';
import { useTaskStore } from '@/stores/task';

const store = useTaskStore();
const taskId = ref('');
const deliveryCode = ref('');
const deliveryProof = ref('');
const submitting = ref(false);
const locationMsg = ref('');

const requireDeliveryCode = computed<boolean>(() => store.current?.requireDeliveryCode === true);
const errandTypeCode = computed<string | null>(() => store.current?.errandTypeCode ?? null);

const typeLabel = computed<string>(() => {
  switch (errandTypeCode.value) {
    case 'BUY':
      return '代买';
    case 'DELIVER':
      return '代送';
    case 'HELP':
      return '代办';
    case 'CUSTOM':
      return '自定义';
    default:
      return store.current?.bizType === 'FOOD' ? '外卖配送' : '配送';
  }
});

const codeTip = computed<string>(() => {
  if (errandTypeCode.value === 'HELP') return '请向用户索取完成确认码,核验后确认';
  if (errandTypeCode.value === 'BUY') return '请向用户出示物品,索取收货码核验';
  return '请向收件人索取收货码,核验后确认送达';
});

async function submit(): Promise<void> {
  if (requireDeliveryCode.value && !deliveryCode.value.trim()) {
    uni.showToast({ title: '请输入收货码', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    locationMsg.value = '';
    const point = await locationService.getOnce().catch((err) => {
      locationMsg.value = err instanceof Error ? err.message : '定位失败';
      return null;
    });
    if (!point) {
      uni.showToast({ title: locationMsg.value || '定位失败', icon: 'none' });
      return;
    }
    const ok = await store.delivered(taskId.value, {
      deliveryProof: deliveryProof.value || undefined,
      deliveryCode: requireDeliveryCode.value ? deliveryCode.value.trim() : undefined,
      lng: point.longitude,
      lat: point.latitude,
    });
    if (ok) {
      uni.showToast({ title: '已送达', icon: 'success' });
      setTimeout(() => uni.switchTab({ url: '/pages/workbench/index' }), 600);
    }
  } catch (err) {
    uni.showToast({ title: err instanceof Error ? err.message : '送达失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}

onLoad((options) => {
  taskId.value = (options?.taskId as string) ?? '';
});

onMounted(async () => {
  if (taskId.value && (!store.current || store.current.taskId !== taskId.value)) {
    await store.load(taskId.value);
  }
});
</script>

<template>
  <view class="d">
    <view class="d__hero">
      <text class="d__hero-tag">{{ typeLabel }} · 送达确认</text>
      <text class="d__hero-title">{{ requireDeliveryCode ? codeTip : '完成后点击确认即可' }}</text>
    </view>

    <view class="d__card">
      <view v-if="requireDeliveryCode" class="d__field">
        <view class="d__label"><text>收货码</text><text class="d__required">*</text></view>
        <input
          v-model="deliveryCode"
          type="number"
          maxlength="8"
          placeholder="请输入用户出示的 4 位收货码"
          class="d__input"
        />
      </view>
      <view class="d__field d__field--last">
        <view class="d__label"><text>送达凭证(选填)</text></view>
        <input v-model="deliveryProof" placeholder="例:photo:9001" class="d__input" />
      </view>
    </view>

    <view v-if="locationMsg" class="d__error-tip">{{ locationMsg }}</view>

    <view class="d__bar">
      <button class="d__cta" :loading="submitting" :disabled="submitting" @tap="submit">
        {{ submitting ? '提交中…' : '确认送达' }}
      </button>
    </view>
  </view>
</template>

<style scoped>
.d {
  min-height: 100vh;
  background: #f5f6f8;
  padding-bottom: 200rpx;
}
.d__hero {
  padding: 40rpx 32rpx 56rpx;
  background: var(--brand-gradient-reverse);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  position: relative;
  z-index: 1;
}
.d__hero-tag {
  font-size: 22rpx;
  letter-spacing: 1rpx;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.22);
  align-self: flex-start;
}
.d__hero-title {
  font-size: 32rpx;
  font-weight: 800;
  margin-top: 18rpx;
  line-height: 1.4;
}

.d__card {
  position: relative;
  z-index: 2;
  margin: -28rpx 24rpx 0;
  padding: 8rpx 28rpx;
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.08);
}
.d__field {
  padding: 24rpx 0;
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.06);
}
.d__field--last {
  border-bottom: none;
}
.d__label {
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: var(--text-secondary);
  margin-bottom: 12rpx;
}
.d__required {
  color: var(--price-color);
  margin-left: 4rpx;
}
.d__input {
  width: 100%;
  min-height: 80rpx;
  padding: 20rpx 24rpx;
  background: #f7f8fa;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: var(--text-primary);
  box-sizing: border-box;
  letter-spacing: 4rpx;
}

.d__error-tip {
  margin: 16rpx 24rpx 0;
  padding: 16rpx 24rpx;
  background: rgba(255, 77, 79, 0.08);
  border-radius: 16rpx;
  color: var(--price-color);
  font-size: 24rpx;
}

.d__bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 24rpx calc(env(safe-area-inset-bottom, 0rpx) + 20rpx);
  background: #f5f6f8;
  border-top: 1rpx solid rgba(31, 41, 55, 0.06);
  z-index: 50;
}
.d__cta {
  background: var(--brand-gradient-reverse);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: 999rpx;
  padding: 22rpx 0;
  box-shadow: 0 12rpx 28rpx rgba(17, 153, 142, 0.32);
}
.d__cta[disabled] {
  opacity: 0.6;
}
</style>
