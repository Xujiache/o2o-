<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed, onMounted, ref } from 'vue';

import { getAddresses, upsertAddress, type AddressItemVo } from '@/api';

const addressId = ref<string | undefined>(undefined);
const receiverName = ref('');
const mobile = ref('');
const cityCode = ref('');
const cityName = ref('');
const detail = ref('');
const lng = ref(0);
const lat = ref(0);
const isDefault = ref(false);
const submitting = ref(false);
const errorMsg = ref('');

const PICKED_CITY_KEY = 'o2o:customer:picked-city';
const PICKED_LOCATION_KEY = 'o2o:customer:picked-location';
const PICKED_COORDS_KEY = 'o2o:customer:picked-coords';

const canSubmit = computed(
  () =>
    receiverName.value.trim().length >= 1 &&
    /^1[3-9]\d{9}$/.test(mobile.value) &&
    cityCode.value.length > 0 &&
    detail.value.trim().length > 0 &&
    !submitting.value,
);

onMounted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const route = (getCurrentPages?.() as any[])?.at(-1);
  const q = route?.options ?? {};
  if (q.addressId) {
    addressId.value = q.addressId as string;
    void loadAddress(q.addressId as string);
  }
});

onShow(() => {
  syncPickedCity();
  syncPickedLocation();
});

async function loadAddress(id: string): Promise<void> {
  // 简化:从列表里查(stage 1 没单条 GET 接口)
  const r = await getAddresses(1, 100);
  if (r.code === '0' && r.data) {
    const found = r.data.list.find((a: AddressItemVo) => a.addressId === id);
    if (found) {
      receiverName.value = found.receiverName;
      // mobileMasked → 不能直接用作 mobile,要求用户重新填
      cityCode.value = found.cityCode;
      detail.value = found.detail;
      lng.value = Number(found.lng);
      lat.value = Number(found.lat);
      isDefault.value = found.isDefault;
    }
  }
}

function pickCity(): void {
  uni.navigateTo({
    url: `/pages/address/city?back=1`,
  });
}

function pickMap(): void {
  uni.navigateTo({
    url: `/pages/address/map?back=1`,
  });
}

function syncPickedCity(): void {
  try {
    const raw = uni.getStorageSync(PICKED_CITY_KEY) as string;
    if (!raw) return;
    const city = JSON.parse(raw) as { cityCode?: string; cityName?: string };
    if (city.cityCode) cityCode.value = city.cityCode;
    if (city.cityName) cityName.value = city.cityName;
    uni.removeStorageSync(PICKED_CITY_KEY);
  } catch {
    // ignore invalid legacy storage
  }
}

function syncPickedLocation(): void {
  try {
    const rawLocation = uni.getStorageSync(PICKED_LOCATION_KEY) as string;
    if (rawLocation) {
      const location = JSON.parse(rawLocation) as { lng?: number; lat?: number; address?: string; name?: string };
      if (typeof location.lng === 'number' && typeof location.lat === 'number') {
        lng.value = location.lng;
        lat.value = location.lat;
      }
      if (!detail.value && (location.address || location.name)) {
        detail.value = location.address || location.name || '';
      }
      uni.removeStorageSync(PICKED_LOCATION_KEY);
      uni.removeStorageSync(PICKED_COORDS_KEY);
      return;
    }
    const rawCoords = uni.getStorageSync(PICKED_COORDS_KEY) as string;
    if (!rawCoords) return;
    const coords = JSON.parse(rawCoords) as { lng?: number; lat?: number };
    if (typeof coords.lng === 'number' && typeof coords.lat === 'number') {
      lng.value = coords.lng;
      lat.value = coords.lat;
      uni.removeStorageSync(PICKED_COORDS_KEY);
    }
  } catch {
    // ignore invalid legacy storage
  }
}

function onDefaultChange(e: Event): void {
  isDefault.value = Boolean((e as unknown as { detail?: { value?: boolean } }).detail?.value);
}

async function onSubmit(): Promise<void> {
  if (!canSubmit.value) return;
  errorMsg.value = '';
  submitting.value = true;
  try {
    const r = await upsertAddress({
      addressId: addressId.value,
      receiverName: receiverName.value.trim(),
      mobile: mobile.value,
      cityCode: cityCode.value,
      detail: detail.value.trim(),
      lng: lng.value,
      lat: lat.value,
      isDefault: isDefault.value,
    });
    if (r.code !== '0') {
      errorMsg.value = r.message;
      return;
    }
    uni.navigateBack();
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '保存失败';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="addr-edit">
    <view class="addr-edit__title">{{ addressId ? '编辑地址' : '新增地址' }}</view>

    <text class="addr-edit__label">收件人</text>
    <input class="addr-edit__field" placeholder="收件人姓名" v-model="receiverName" />

    <text class="addr-edit__label">手机号</text>
    <input class="addr-edit__field" type="number" maxlength="11" placeholder="11 位手机号" v-model="mobile" />

    <text class="addr-edit__label">城市</text>
    <view class="addr-edit__field addr-edit__field--picker" @click="pickCity">
      <text>{{ cityName || cityCode || '请选择城市' }}</text>
      <text class="addr-edit__chev">›</text>
    </view>

    <text class="addr-edit__label">详细地址</text>
    <input class="addr-edit__field" placeholder="街道门牌号" v-model="detail" />

    <text class="addr-edit__label">坐标(地图选点)</text>
    <view class="addr-edit__field addr-edit__field--picker" @click="pickMap">
      <text>{{ lng && lat ? `${lng.toFixed(4)}, ${lat.toFixed(4)}` : '点击选择' }}</text>
      <text class="addr-edit__chev">›</text>
    </view>

    <view class="addr-edit__row">
      <text>设为默认地址</text>
      <switch :checked="isDefault" @change="onDefaultChange" />
    </view>

    <button class="addr-edit__submit" :disabled="!canSubmit" @click="onSubmit">
      {{ submitting ? '保存中...' : '保存' }}
    </button>

    <text v-if="errorMsg" class="addr-edit__error">{{ errorMsg }}</text>
  </view>
</template>

<style scoped>
.addr-edit {
  padding: 48rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.addr-edit__title {
  font-size: 40rpx;
  font-weight: 600;
}
.addr-edit__label {
  font-size: 26rpx;
  color: #666;
  margin-top: 16rpx;
}
.addr-edit__field {
  font-size: 32rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #ddd;
}
.addr-edit__field--picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.addr-edit__chev {
  color: #ccc;
  font-size: 36rpx;
}
.addr-edit__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 32rpx;
  font-size: 28rpx;
}
.addr-edit__submit {
  margin-top: 48rpx;
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
.addr-edit__submit[disabled] {
  background: #c5d4ff;
}
.addr-edit__error {
  color: #ff4d4f;
  font-size: 26rpx;
}
</style>
