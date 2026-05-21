<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app';
import { computed, onMounted, ref } from 'vue';

import SvgIcon from '@/components/common/SvgIcon.vue';
import { type AddressItemVo, getAddresses } from '@/api';
import { previewOrder, type PreviewVo, submitOrder } from '@/api/food-orders';
import { useFoodCartStore } from '@/stores/food-cart';
import { useFoodOrderStore } from '@/stores/food-order';
import { formatYuan } from '@/utils/format-price';
import NavBar from '@/components/common/NavBar.vue';

const cart = useFoodCartStore();
const orderStore = useFoodOrderStore();

const storeId = ref('');
const address = ref<AddressItemVo | null>(null);
const addressLoading = ref(false);
const deliveryType = ref<'instant' | 'reserved'>('instant');
const reservedTime = ref<number | undefined>(undefined);
const payChannel = ref<'wxpay' | 'alipay'>('wxpay');
const remark = ref('');
const preview = ref<PreviewVo | null>(null);
const previewError = ref('');
const loading = ref(false);
const submitting = ref(false);
const selectedCouponId = ref<string>('');

const items = computed(() => cart.cart?.items ?? []);
const hasAddress = computed(() => !!address.value);

async function loadDefaultAddress(): Promise<void> {
  addressLoading.value = true;
  try {
    const r = await getAddresses(1, 50);
    if (r.code === '0' && r.data) {
      const list = r.data.list;
      address.value = list.find((a) => a.isDefault) ?? list[0] ?? null;
    }
  } finally {
    addressLoading.value = false;
  }
}

async function loadAddressById(addressId: string): Promise<void> {
  const r = await getAddresses(1, 50);
  if (r.code === '0' && r.data) {
    address.value = r.data.list.find((a) => a.addressId === addressId) ?? address.value;
  }
}

async function loadPreview(): Promise<void> {
  if (!cart.cart || items.value.length === 0) {
    previewError.value = '购物车为空';
    return;
  }
  if (!address.value) {
    previewError.value = '请先选择收件地址';
    return;
  }
  loading.value = true;
  previewError.value = '';
  try {
    const r = await previewOrder({
      storeId: storeId.value,
      items: items.value.map((it) => ({ skuId: it.skuId, quantity: it.quantity })),
      addressId: address.value.addressId,
      deliveryType: deliveryType.value,
      reservedTime: reservedTime.value,
      couponId: selectedCouponId.value || undefined,
    });
    if (r.code === '0' && r.data) {
      preview.value = r.data;
      orderStore.setPreview(r.data, storeId.value);
    } else {
      previewError.value = r.message ?? '试算失败';
      preview.value = null;
      // 券引起的错误 → 清掉选择,让用户能继续无券下单
      if (selectedCouponId.value) selectedCouponId.value = '';
    }
  } finally {
    loading.value = false;
  }
}

async function submit(): Promise<void> {
  if (!preview.value) return;
  submitting.value = true;
  try {
    const r = await submitOrder({
      previewId: preview.value.previewId,
      payChannel: payChannel.value,
      remark: remark.value || undefined,
    });
    if (r.code === '0' && r.data) {
      orderStore.setSubmitted(r.data);
      orderStore.setPayChannel(payChannel.value);
      cart.clear();
      uni.redirectTo({ url: '/pages/payment/cashier?orderId=' + r.data.orderId });
    } else {
      uni.showToast({ title: r.message ?? '提交失败', icon: 'none' });
    }
  } finally {
    submitting.value = false;
  }
}

function gotoPickAddress(): void {
  uni.navigateTo({ url: '/pages/address/list?selectMode=1' });
}

function gotoNewAddress(): void {
  uni.navigateTo({ url: '/pages/address/edit' });
}

function pickCoupon(): void {
  const goods = preview.value?.goodsAmount ?? '0';
  const qs = `goodsAmount=${encodeURIComponent(goods)}&couponId=${encodeURIComponent(selectedCouponId.value)}`;
  uni.navigateTo({ url: `/pages/food/order/coupon-pick?${qs}` });
}

onLoad((options) => {
  storeId.value = ((options?.storeId as string) ?? cart.currentStoreId ?? '') as string;
});

onMounted(async () => {
  await loadDefaultAddress();
  void loadPreview();
});

// 从 address/list 选地址回传后,onShow 触发 → 消费 pickedAddressId 并刷新试算
onShow(async () => {
  const picked = orderStore.consumePickedAddress();
  if (picked) {
    await loadAddressById(picked);
    void loadPreview();
  }
  // 从 coupon-pick 选券回传:'' = 主动不使用;具体 id = 选了;null = 未变化
  const pickedCoupon = orderStore.consumePickedCoupon();
  if (pickedCoupon !== null) {
    selectedCouponId.value = pickedCoupon;
    void loadPreview();
  }
});
</script>

<template>
  <view class="confirm">
    <NavBar title="确认订单" />
    <!-- 地址卡 -->
    <view class="confirm__addr" @tap="gotoPickAddress">
      <view v-if="addressLoading" class="confirm__addr-loading">加载地址中…</view>
      <template v-else-if="address">
        <view class="confirm__addr-row">
          <text class="confirm__addr-name">{{ address.receiverName }}</text>
          <text class="confirm__addr-mobile">{{ address.mobileMasked }}</text>
        </view>
        <text class="confirm__addr-detail">{{ address.detail }}</text>
        <text class="confirm__addr-arrow">›</text>
      </template>
      <template v-else>
        <text class="confirm__addr-empty">暂无收件地址</text>
        <text class="confirm__addr-add" @tap.stop="gotoNewAddress">+ 新增地址</text>
      </template>
    </view>

    <!-- 商家 / 商品 -->
    <view class="confirm__card">
      <view class="confirm__card-h">订单详情</view>
      <view v-for="it in items" :key="it.cartItemId" class="confirm__line">
        <text class="confirm__line-name"
          >{{ it.name }} <text class="confirm__line-spec">{{ it.specValue }}</text></text
        >
        <text class="confirm__line-qty">× {{ it.quantity }}</text>
        <text class="confirm__line-sub">¥{{ formatYuan(it.subTotal) }}</text>
      </view>
    </view>

    <!-- 配送 -->
    <view class="confirm__card">
      <view class="confirm__row">
        <text class="confirm__row-label">配送方式</text>
        <picker
          :range="['即时配送', '预约配送']"
          :value="deliveryType === 'instant' ? 0 : 1"
          @change="
            deliveryType = $event.detail.value === 0 ? 'instant' : 'reserved';
            void loadPreview();
          "
        >
          <text class="confirm__row-value">{{ deliveryType === 'instant' ? '即时配送' : '预约配送' }} ›</text>
        </picker>
      </view>
      <view class="confirm__row" @tap="pickCoupon">
        <text class="confirm__row-label">优惠券</text>
        <text
          v-if="selectedCouponId && preview && Number(preview.discountAmount) > 0"
          class="confirm__row-value confirm__row-value--accent"
        >
          已抵扣 ¥{{ formatYuan(preview.discountAmount) }} ›
        </text>
        <text v-else class="confirm__row-value">点击选择 ›</text>
      </view>
      <view class="confirm__row confirm__row--mute">
        <text class="confirm__row-label">积分抵扣</text>
        <text class="confirm__row-value">暂未开放</text>
      </view>
    </view>

    <!-- 金额 -->
    <view v-if="preview" class="confirm__card">
      <view class="confirm__amt">
        <text>商品金额</text><text>¥{{ formatYuan(preview.goodsAmount) }}</text>
      </view>
      <view class="confirm__amt">
        <text>配送费</text><text>¥{{ formatYuan(preview.deliveryFee) }}</text>
      </view>
      <view v-if="Number(preview.discountAmount) > 0" class="confirm__amt">
        <text>优惠</text><text>-¥{{ formatYuan(preview.discountAmount) }}</text>
      </view>
      <view class="confirm__amt confirm__amt--total">
        <text>实付</text><text class="confirm__amt-pay">¥{{ formatYuan(preview.payableAmount) }}</text>
      </view>
    </view>
    <view v-else-if="loading" class="confirm__hint">试算中…</view>
    <view v-else-if="previewError" class="confirm__hint confirm__hint--err">{{ previewError }}</view>

    <!-- 支付方式 -->
    <view class="confirm__card">
      <view class="confirm__row-label">支付方式</view>
      <view class="confirm__channels">
        <view
          class="confirm__channel"
          :class="{ 'confirm__channel--active': payChannel === 'wxpay' }"
          @tap="payChannel = 'wxpay'"
        >
          <SvgIcon name="wechat" :size="32" color="#07c160" />
          <text>微信支付</text>
        </view>
        <view
          class="confirm__channel"
          :class="{ 'confirm__channel--active': payChannel === 'alipay' }"
          @tap="payChannel = 'alipay'"
        >
          <SvgIcon name="alipay" :size="32" color="#1677ff" />
          <text>支付宝</text>
        </view>
      </view>
    </view>

    <!-- 底部提交栏 -->
    <view class="confirm__bottom">
      <view class="confirm__bottom-amt">
        <text class="confirm__bottom-label">合计</text>
        <text class="confirm__bottom-pay">¥{{ preview ? formatYuan(preview.payableAmount) : '--' }}</text>
      </view>
      <button
        class="confirm__bottom-btn"
        :disabled="!preview || submitting || !hasAddress"
        :loading="submitting"
        @tap="submit"
      >
        {{ submitting ? '提交中…' : '提交订单' }}
      </button>
    </view>
  </view>
</template>

<style scoped>
.confirm {
  min-height: 100vh;
  padding: 24rpx 24rpx 200rpx;
  background: #fff;
}

.confirm__addr {
  position: relative;
  background: var(--brand-gradient);
  border-radius: 24rpx;
  padding: 32rpx 56rpx 32rpx 32rpx;
  color: #fff;
  margin-bottom: 16rpx;
  box-shadow: 0 18rpx 40rpx rgba(46, 156, 93, 0.24);
}
.confirm__addr-loading,
.confirm__addr-empty {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.92);
}
.confirm__addr-add {
  display: inline-block;
  margin-left: 24rpx;
  font-size: 24rpx;
  background: rgba(255, 255, 255, 0.18);
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
}
.confirm__addr-row {
  display: flex;
  gap: 16rpx;
  align-items: baseline;
}
.confirm__addr-name {
  font-size: 32rpx;
  font-weight: 700;
}
.confirm__addr-mobile {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.86);
}
.confirm__addr-detail {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.94);
}
.confirm__addr-arrow {
  position: absolute;
  right: 28rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 40rpx;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.85);
}

.confirm__card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, 0.04);
}
.confirm__card-h {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16rpx;
}
.confirm__line {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.05);
  font-size: 26rpx;
}
.confirm__line:last-child {
  border-bottom: 0;
}
.confirm__line-name {
  flex: 1;
  color: var(--text-primary);
}
.confirm__line-spec {
  color: var(--text-muted);
  font-size: 22rpx;
  margin-left: 8rpx;
}
.confirm__line-qty {
  color: var(--text-muted);
  font-size: 24rpx;
}
.confirm__line-sub {
  color: var(--price-color);
  font-size: 26rpx;
  font-weight: 600;
}
.confirm__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18rpx 0;
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.05);
}
.confirm__row:last-child {
  border-bottom: 0;
}
.confirm__row-label {
  font-size: 26rpx;
  color: var(--text-secondary);
}
.confirm__row-value {
  font-size: 26rpx;
  color: var(--text-primary);
}
.confirm__row--mute .confirm__row-value {
  color: #c5c9d2;
}
.confirm__row-value--accent {
  color: var(--brand-primary);
  font-weight: 600;
  max-width: 60%;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.confirm__amt {
  display: flex;
  justify-content: space-between;
  font-size: 26rpx;
  color: var(--text-secondary);
  padding: 8rpx 0;
}
.confirm__amt--total {
  margin-top: 12rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid rgba(31, 41, 55, 0.06);
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-primary);
}
.confirm__amt-pay {
  color: var(--price-color);
  font-size: 36rpx;
}
.confirm__hint {
  text-align: center;
  padding: 24rpx 0;
  color: var(--text-muted);
  font-size: 26rpx;
}
.confirm__hint--err {
  color: var(--price-color);
}

.confirm__channels {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}
.confirm__channel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  background: #fff;
  font-size: 26rpx;
  color: var(--text-secondary);
  border: 2rpx solid transparent;
}
.confirm__channel-icon {
  font-size: 30rpx;
}
.confirm__channel--active {
  border-color: var(--brand-primary);
  background: rgba(46, 156, 93, 0.08);
  color: var(--brand-primary);
  font-weight: 600;
}

.confirm__bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx 32rpx;
  background: #fff;
  box-shadow: 0 -8rpx 24rpx rgba(31, 41, 55, 0.08);
}
.confirm__bottom-amt {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}
.confirm__bottom-label {
  font-size: 24rpx;
  color: var(--text-secondary);
}
.confirm__bottom-pay {
  font-size: 38rpx;
  color: var(--price-color);
  font-weight: 700;
}
.confirm__bottom-btn {
  background: var(--brand-gradient);
  color: #fff;
  border-radius: 999rpx;
  padding: 0 56rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 30rpx;
  font-weight: 700;
}
.confirm__bottom-btn[disabled] {
  background: #c5c9d2;
  color: #fff;
}
</style>
