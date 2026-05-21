<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { onMounted, ref } from 'vue';

import { type AddressItemVo, getAddresses } from '@/api';
import AddressCard from '@/components/common/AddressCard.vue';
import { useFoodOrderStore } from '@/stores/food-order';
import NavBar from '@/components/common/NavBar.vue';

const list = ref<AddressItemVo[]>([]);
const loading = ref(false);
const selectMode = ref(false);
const orderStore = useFoodOrderStore();

onLoad((options) => {
  selectMode.value = options?.selectMode === '1';
});

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await getAddresses(1, 50);
    if (r.code === '0' && r.data) {
      list.value = r.data.list;
    }
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function onEdit(addressId: string): void {
  uni.navigateTo({ url: `/pages/address/edit?addressId=${addressId}` });
}

function onPick(item: AddressItemVo): void {
  orderStore.pickAddress(item.addressId);
  uni.navigateBack();
}

function onAdd(): void {
  uni.navigateTo({ url: '/pages/address/edit' });
}
</script>

<template>
  <view class="address-list">
    <NavBar title="我的地址" />
    <view v-if="selectMode" class="address-list__hint">点击地址完成选择</view>
    <view v-if="loading" class="address-list__loading">加载中...</view>
    <view v-else-if="list.length === 0" class="address-list__empty">暂无收件地址,新增一个吧</view>

    <view v-for="item in list" :key="item.addressId" class="address-list__row">
      <AddressCard :address="item" @edit="onEdit" />
      <view v-if="selectMode" class="address-list__pick-overlay" @tap="onPick(item)" />
    </view>

    <button class="address-list__add" @click="onAdd">+ 新增收件地址</button>
  </view>
</template>

<style scoped>
.address-list {
  padding: 24rpx;
  min-height: 100vh;
  background: #fff;
}
.address-list__hint {
  background: rgba(46, 156, 93, 0.1);
  color: var(--brand-primary);
  padding: 16rpx 24rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
  margin-bottom: 16rpx;
  text-align: center;
}
.address-list__loading,
.address-list__empty {
  text-align: center;
  color: #888;
  padding: 64rpx 0;
  font-size: 26rpx;
}
.address-list__row {
  position: relative;
}
.address-list__pick-overlay {
  position: absolute;
  inset: 0;
  border-radius: 12rpx;
}
.address-list__add {
  position: fixed;
  bottom: 32rpx;
  left: 24rpx;
  right: 24rpx;
  background: var(--brand-gradient);
  color: #fff;
  border-radius: 999rpx;
  font-weight: 700;
}
</style>
