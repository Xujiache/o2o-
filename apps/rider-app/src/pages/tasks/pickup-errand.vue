<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { computed, onMounted, ref } from 'vue';

import { useTaskStore } from '@/stores/task';

const store = useTaskStore();
const taskId = ref('');
const pickupCode = ref('');
const itemCheckResult = ref('OK');
const submitting = ref(false);

const requirePickupCode = computed<boolean>(() => store.current?.requirePickupCode === true);
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
      return '跑腿';
  }
});

const noCodeTip = computed<string>(() => {
  switch (errandTypeCode.value) {
    case 'BUY':
      return '代买类无需取件码,请前往商家自行购买后确认取件';
    case 'HELP':
      return '代办类无需取件码,请前往办事地点完成事项后确认';
    case 'CUSTOM':
      return '自定义类无需取件码,与用户沟通后确认取件';
    default:
      return '本任务无需取件码,直接确认取件即可';
  }
});

async function submit(): Promise<void> {
  if (requirePickupCode.value && !pickupCode.value.trim()) {
    uni.showToast({ title: '请输入取件码', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    const ok = await store.pickup(taskId.value, {
      pickupCode: requirePickupCode.value ? pickupCode.value.trim() : undefined,
      itemCheckResult: itemCheckResult.value,
    });
    if (ok) {
      uni.showToast({ title: '已取件', icon: 'success' });
      setTimeout(() => uni.switchTab({ url: '/pages/tasks/current' }), 600);
    }
  } catch (err) {
    uni.showToast({ title: err instanceof Error ? err.message : '取件失败', icon: 'none' });
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
  <view class="p">
    <view class="p__hero">
      <text class="p__hero-tag">{{ typeLabel }} · 取件核验</text>
      <text class="p__hero-title">{{ requirePickupCode ? '请向用户索取取件码' : '无需取件码,确认即可' }}</text>
    </view>

    <!-- 需要取件码:输入卡 -->
    <view v-if="requirePickupCode" class="p__card">
      <view class="p__field">
        <view class="p__label"><text>取件码</text><text class="p__required">*</text></view>
        <input
          v-model="pickupCode"
          type="number"
          maxlength="8"
          placeholder="请输入用户出示的 4 位取件码"
          class="p__input"
        />
      </view>
      <view class="p__field p__field--last">
        <view class="p__label"><text>核验结果</text></view>
        <input v-model="itemCheckResult" placeholder="如:OK / 物品完整" class="p__input" />
      </view>
    </view>

    <!-- 无需取件码:说明卡 -->
    <view v-else class="p__notice">
      <text class="p__notice-icon">ℹ️</text>
      <text class="p__notice-text">{{ noCodeTip }}</text>
    </view>

    <view class="p__bar">
      <button class="p__cta" :loading="submitting" :disabled="submitting" @tap="submit">
        {{ submitting ? '提交中…' : '确认取件' }}
      </button>
    </view>
  </view>
</template>

<style scoped>
.p {
  min-height: 100vh;
  background: #f5f6f8;
  padding-bottom: 200rpx;
}
.p__hero {
  padding: 40rpx 32rpx 56rpx;
  background: linear-gradient(135deg, #5b5ff8 0%, #00b8d9 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  position: relative;
  z-index: 1;
}
.p__hero-tag {
  font-size: 22rpx;
  letter-spacing: 1rpx;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.22);
  align-self: flex-start;
}
.p__hero-title {
  font-size: 38rpx;
  font-weight: 800;
  margin-top: 18rpx;
}

.p__card {
  position: relative;
  z-index: 2;
  margin: -28rpx 24rpx 0;
  padding: 8rpx 28rpx;
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.08);
}
.p__field {
  padding: 24rpx 0;
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.06);
}
.p__field--last {
  border-bottom: none;
}
.p__label {
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: #5a6275;
  margin-bottom: 12rpx;
}
.p__required {
  color: #ff4d4f;
  margin-left: 4rpx;
}
.p__input {
  width: 100%;
  min-height: 80rpx;
  padding: 20rpx 24rpx;
  background: #f7f8fa;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #172033;
  box-sizing: border-box;
  letter-spacing: 4rpx;
}

.p__notice {
  position: relative;
  z-index: 2;
  margin: -28rpx 24rpx 0;
  padding: 28rpx;
  background: linear-gradient(135deg, #fff8e1 0%, #ffe7b3 100%);
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.p__notice-icon {
  font-size: 36rpx;
  flex-shrink: 0;
}
.p__notice-text {
  flex: 1;
  font-size: 26rpx;
  color: #ad6800;
  line-height: 1.5;
}

.p__bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 24rpx calc(env(safe-area-inset-bottom, 0rpx) + 20rpx);
  background: #f5f6f8;
  border-top: 1rpx solid rgba(31, 41, 55, 0.06);
  z-index: 50;
}
.p__cta {
  background: linear-gradient(135deg, #5b5ff8, #00b8d9);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: 999rpx;
  padding: 22rpx 0;
  box-shadow: 0 12rpx 28rpx rgba(91, 95, 248, 0.3);
}
.p__cta[disabled] {
  opacity: 0.6;
}
</style>
