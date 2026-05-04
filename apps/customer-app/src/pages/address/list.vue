<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { type AddressItemVo, getAddresses } from '@/api';
import AddressCard from '@/components/common/AddressCard.vue';

const list = ref<AddressItemVo[]>([]);
const loading = ref(false);

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

function onAdd(): void {
  uni.navigateTo({ url: '/pages/address/edit' });
}
</script>

<template>
  <view class="address-list">
    <view v-if="loading" class="address-list__loading">加载中...</view>
    <view v-else-if="list.length === 0" class="address-list__empty">暂无收件地址,新增一个吧</view>
    <AddressCard v-for="item in list" :key="item.addressId" :address="item" @edit="onEdit" />

    <button class="address-list__add" @click="onAdd">+ 新增收件地址</button>
  </view>
</template>

<style scoped>
.address-list {
  padding: 24rpx;
  min-height: 100vh;
  background: #f5f5f5;
}
.address-list__loading,
.address-list__empty {
  text-align: center;
  color: #888;
  padding: 64rpx 0;
  font-size: 26rpx;
}
.address-list__add {
  position: fixed;
  bottom: 32rpx;
  left: 24rpx;
  right: 24rpx;
  background: #4c84ff;
  color: #fff;
  border-radius: 12rpx;
}
</style>
