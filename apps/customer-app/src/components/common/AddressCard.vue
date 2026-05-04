<script setup lang="ts">
import type { AddressItemVo } from '@/api';

interface Props {
  address: AddressItemVo;
}
defineProps<Props>();
defineEmits<{ (e: 'edit', addressId: string): void }>();
</script>

<template>
  <view class="address-card" @click="$emit('edit', address.addressId)">
    <view class="address-card__header">
      <text class="address-card__name">{{ address.receiverName }}</text>
      <text class="address-card__mobile">{{ address.mobileMasked }}</text>
      <text v-if="address.isDefault" class="address-card__badge">默认</text>
    </view>
    <text class="address-card__detail">{{ address.detail }}</text>
  </view>
</template>

<style scoped>
.address-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.address-card__header {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.address-card__name {
  font-size: 30rpx;
  font-weight: 600;
}
.address-card__mobile {
  font-size: 26rpx;
  color: #888;
}
.address-card__badge {
  font-size: 22rpx;
  background: #4c84ff;
  color: #fff;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}
.address-card__detail {
  font-size: 26rpx;
  color: #555;
}
</style>
