<script setup lang="ts">
/**
 * GR-3 生鲜下单确认页
 *
 * 进入方式:从商品详情页"加入购物车"传 productId+portions+productName+unitPrice+estimatedPerPortionGrams
 * (本阶段无持久化购物车,直接走单品下单;GR-3 之后版本可扩多商品)
 */
import { computed, onMounted, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

import { listPickupPoints, type PickupPointVo } from '@/api/pickup-points';
import { submitGroceryOrder } from '@/api/grocery-orders';
import { useAuthStore } from '@/stores/auth';

interface OrderRow {
  productId: string;
  productName: string;
  unitPriceCentsPerJin: number;
  estimatedPerPortionGrams: number;
  portions: number;
  pricedBy: 'weight' | 'piece' | 'sku';
  skuId?: string;
}

const row = ref<OrderRow | null>(null);
const pickupPoint = ref<PickupPointVo | null>(null);
const pickupLoading = ref(false);
const remark = ref('');
const submitting = ref(false);

const totalGrams = computed<number>(() => {
  if (!row.value) return 0;
  if (row.value.pricedBy === 'piece') return 0;
  return row.value.portions * row.value.estimatedPerPortionGrams;
});

const totalCents = computed<number>(() => {
  if (!row.value) return 0;
  if (row.value.pricedBy === 'sku' || row.value.pricedBy === 'piece') {
    return row.value.unitPriceCentsPerJin * row.value.portions;
  }
  return Math.round((row.value.unitPriceCentsPerJin * totalGrams.value) / 500);
});

const totalYuan = computed<string>(() => (totalCents.value / 100).toFixed(2));

async function autoSelectFirstPickup(): Promise<void> {
  pickupLoading.value = true;
  try {
    const r = await listPickupPoints({ limit: 10 });
    if (r.code === '0' && r.data && r.data.list.length > 0) {
      pickupPoint.value = r.data.list[0]!;
    }
  } finally {
    pickupLoading.value = false;
  }
}

function openPicker(): void {
  uni.navigateTo({
    url: '/pages/grocery/pickup-point/picker',
    events: {
      'pickup:selected': (p: PickupPointVo) => {
        pickupPoint.value = p;
      },
    },
  });
}

async function submit(): Promise<void> {
  if (!row.value) return;
  if (!pickupPoint.value) {
    uni.showToast({ title: '请先选择自提点', icon: 'none' });
    return;
  }
  if (!useAuthStore().isLoggedIn) {
    uni.showModal({
      title: '请先登录',
      content: '提交订单需要登录,即刻前往登录?',
      confirmText: '去登录',
      success: (m) => {
        if (m.confirm) uni.reLaunch({ url: '/pages/login/index' });
      },
    });
    return;
  }
  submitting.value = true;
  try {
    const res = await submitGroceryOrder({
      pickupPointId: pickupPoint.value.pickupPointId,
      items: [
        {
          productId: row.value.productId,
          portions: row.value.portions,
          ...(row.value.skuId ? { skuId: row.value.skuId } : {}),
        },
      ],
      remark: remark.value || undefined,
    });
    if (res.code === '0' && res.data) {
      uni.showToast({ title: '下单成功', icon: 'success' });
      // mock 模式:跳订单详情(支付环节 GR-3 后期接入)
      setTimeout(() => {
        uni.redirectTo({ url: `/pages/grocery/order/detail?orderId=${res.data!.orderId}` });
      }, 600);
    } else {
      uni.showToast({ title: res.message ?? '下单失败', icon: 'none' });
    }
  } catch {
    uni.showToast({ title: '网络错误', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}

onLoad((q: Record<string, string | undefined>) => {
  const productId = q.productId;
  const productName = q.productName ?? '商品';
  const unitPriceCentsPerJin = Number(q.unitPriceCentsPerJin ?? 0);
  const estimatedPerPortionGrams = Number(q.estimatedPerPortionGrams ?? 500);
  const portions = Number(q.portions ?? 1);
  const pricedBy = (q.pricedBy ?? 'weight') as 'weight' | 'piece' | 'sku';
  const skuId = q.skuId || undefined;
  if (!productId) {
    uni.showToast({ title: '参数缺失', icon: 'none' });
    return;
  }
  row.value = {
    productId,
    productName: decodeURIComponent(productName),
    unitPriceCentsPerJin,
    estimatedPerPortionGrams,
    portions,
    pricedBy,
    skuId,
  };
});

onMounted(() => {
  void autoSelectFirstPickup();
});
</script>

<template>
  <view class="confirm">
    <view class="confirm__hero">
      <text class="confirm__title">确认订单</text>
      <text class="confirm__subtitle">下单后实重以拣货称重为准,多退少补</text>
    </view>

    <!-- 自提点 -->
    <view class="confirm__card" @click="openPicker">
      <view class="confirm__row">
        <text class="confirm__label">自提点</text>
        <text class="confirm__arrow">›</text>
      </view>
      <view v-if="pickupPoint" class="confirm__pickup">
        <text class="confirm__pickup-name">{{ pickupPoint.name }}</text>
        <text class="confirm__pickup-addr">{{ pickupPoint.address }}</text>
        <text class="confirm__pickup-hour"
          >营业 {{ pickupPoint.businessHourStart }} - {{ pickupPoint.businessHourEnd }}</text
        >
      </view>
      <text v-else-if="pickupLoading" class="confirm__pickup-empty">加载中...</text>
      <text v-else class="confirm__pickup-empty">点击选择自提点</text>
    </view>

    <!-- 商品 -->
    <view v-if="row" class="confirm__card">
      <view class="confirm__row">
        <text class="confirm__label">商品</text>
      </view>
      <view class="confirm__item">
        <text class="confirm__item-name">{{ row.productName }}</text>
        <view class="confirm__item-row">
          <text v-if="row.pricedBy === 'weight'" class="confirm__item-info">
            {{ row.portions }} 份 × 约 {{ row.estimatedPerPortionGrams }} g
          </text>
          <text v-else-if="row.pricedBy === 'piece'" class="confirm__item-info">{{ row.portions }} 件</text>
          <text v-else class="confirm__item-info">{{ row.portions }} 份</text>
          <text class="confirm__item-price">¥ {{ totalYuan }}</text>
        </view>
        <text v-if="row.pricedBy === 'weight'" class="confirm__item-tip">
          预估 {{ (totalGrams / 500).toFixed(2) }} 斤 ({{ totalGrams }} g)
        </text>
      </view>
    </view>

    <!-- 备注 -->
    <view class="confirm__card">
      <view class="confirm__row">
        <text class="confirm__label">备注</text>
      </view>
      <input v-model="remark" class="confirm__input" placeholder="可选,如:鸡帮我切块" />
    </view>

    <!-- 估价提示 -->
    <view class="confirm__estimate">
      <text class="confirm__estimate-label">预付估价</text>
      <text class="confirm__estimate-val">¥ {{ totalYuan }}</text>
      <text class="confirm__estimate-tip">拣货时按实际重量结算,多退少补</text>
    </view>

    <view class="confirm__bar">
      <button class="confirm__cta" :loading="submitting" :disabled="!pickupPoint || submitting" @click="submit">
        提交订单
      </button>
    </view>
  </view>
</template>

<style scoped>
.confirm {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 160rpx;
}
.confirm__hero {
  padding: 40rpx 32rpx;
  background: linear-gradient(135deg, #5fbe7d 0%, #2e9c5d 100%);
  color: #fff;
}
.confirm__title {
  font-size: 40rpx;
  font-weight: 800;
}
.confirm__subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  opacity: 0.9;
}
.confirm__card {
  margin: 16rpx 24rpx;
  padding: 24rpx 28rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.05);
}
.confirm__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}
.confirm__label {
  font-size: 26rpx;
  color: #5a6275;
  font-weight: 700;
}
.confirm__arrow {
  font-size: 32rpx;
  color: #94a3b8;
}
.confirm__pickup-name {
  font-size: 30rpx;
  font-weight: 700;
  color: #172033;
  display: block;
  margin-top: 8rpx;
}
.confirm__pickup-addr {
  font-size: 24rpx;
  color: #5a6275;
  display: block;
  margin-top: 4rpx;
}
.confirm__pickup-hour {
  font-size: 22rpx;
  color: #94a3b8;
  display: block;
  margin-top: 4rpx;
}
.confirm__pickup-empty {
  font-size: 24rpx;
  color: #94a3b8;
  display: block;
  margin-top: 8rpx;
}
.confirm__item-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
  display: block;
}
.confirm__item-row {
  display: flex;
  justify-content: space-between;
  margin-top: 8rpx;
}
.confirm__item-info {
  font-size: 24rpx;
  color: #5a6275;
}
.confirm__item-price {
  font-size: 28rpx;
  font-weight: 800;
  color: #ff4d4f;
}
.confirm__item-tip {
  display: block;
  font-size: 20rpx;
  color: #94a3b8;
  margin-top: 4rpx;
}
.confirm__input {
  width: 100%;
  padding: 16rpx 0;
  font-size: 26rpx;
  border-bottom: 1rpx solid rgba(23, 32, 51, 0.08);
}

.confirm__estimate {
  margin: 16rpx 24rpx;
  padding: 28rpx;
  background: linear-gradient(135deg, #fff7ed, #fef3c7);
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
}
.confirm__estimate-label {
  font-size: 22rpx;
  color: #92400e;
}
.confirm__estimate-val {
  font-size: 44rpx;
  font-weight: 900;
  color: #b45309;
}
.confirm__estimate-tip {
  font-size: 20rpx;
  color: #b45309;
  opacity: 0.85;
}

.confirm__bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  background: #fff;
  box-shadow: 0 -10rpx 30rpx rgba(31, 41, 55, 0.05);
}
.confirm__cta {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #ff7a45, #ffb020);
  color: #fff;
  font-weight: 700;
  border-radius: 999rpx;
  border: none;
}
.confirm__cta[disabled] {
  background: #cbd5e1;
}
</style>
