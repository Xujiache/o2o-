<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed, onMounted, ref } from 'vue';

import { getProfile, updateProfile, type RiderProfileVo, type VehicleType } from '@/api';
import FloatTabBar from '@/components/common/FloatTabBar.vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const profile = ref<RiderProfileVo | null>(null);
const editing = ref(false);
const vehicleType = ref<VehicleType>('electric_bike');
const plateNo = ref('');
const brand = ref('');
const saving = ref(false);

const expiryStr = computed(() => {
  const ms = profile.value?.healthCertExpiry;
  return ms ? new Date(Number(ms)).toLocaleDateString() : '—';
});

async function load(): Promise<void> {
  const r = await getProfile();
  if (r.code === '0' && r.data) {
    profile.value = r.data;
    if (r.data.vehicle) {
      vehicleType.value = r.data.vehicle.vehicleType as VehicleType;
      plateNo.value = r.data.vehicle.plateNo ?? '';
      brand.value = r.data.vehicle.brand ?? '';
    }
  }
}

onMounted(load);
onShow(() => uni.hideTabBar({ animation: false }));

async function save(): Promise<void> {
  saving.value = true;
  try {
    const r = await updateProfile({
      vehicle: { vehicleType: vehicleType.value, plateNo: plateNo.value, brand: brand.value },
    });
    if (r.code !== '0') {
      uni.showToast({ icon: 'none', title: r.message || '保存失败' });
      return;
    }
    uni.showToast({ icon: 'success', title: '已保存' });
    editing.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function onLogout(): Promise<void> {
  await auth.logout();
  uni.reLaunch({ url: '/pages/login/index' });
}
</script>

<template>
  <view class="profile">
    <view class="profile__hero">
      <text class="profile__title">个人资料</text>
      <text class="profile__sub">账号资质、健康证与车辆信息</text>
    </view>
    <view v-if="profile" class="profile__card">
      <view class="profile__row"
        ><text>骑手 ID</text><text>{{ profile.riderId }}</text></view
      >
      <view class="profile__row"
        ><text>手机号</text><text>{{ profile.mobile }}</text></view
      >
      <view class="profile__row"
        ><text>真实姓名</text><text>{{ profile.realName ?? '未审核' }}</text></view
      >
      <view class="profile__row"
        ><text>账号状态</text><text>{{ profile.accountStatus }}</text></view
      >
      <view class="profile__row"
        ><text>健康证到期</text><text>{{ expiryStr }}</text></view
      >
      <view class="profile__row"
        ><text>信用分</text><text>{{ profile.creditScore }}</text></view
      >
    </view>

    <view class="profile__section">
      <view class="profile__section-title">车辆信息</view>
      <view v-if="!editing" class="profile__card">
        <view class="profile__row"
          ><text>类型</text><text>{{ profile?.vehicle?.vehicleType ?? '—' }}</text></view
        >
        <view class="profile__row"
          ><text>车牌</text><text>{{ profile?.vehicle?.plateNo ?? '—' }}</text></view
        >
        <view class="profile__row"
          ><text>品牌</text><text>{{ profile?.vehicle?.brand ?? '—' }}</text></view
        >
        <button class="profile__btn" @click="editing = true">编辑车辆</button>
      </view>
      <view v-else class="profile__card">
        <input class="profile__input" v-model="plateNo" placeholder="车牌号" maxlength="20" />
        <input class="profile__input" v-model="brand" placeholder="品牌" maxlength="50" />
        <button class="profile__btn" :disabled="saving" @click="save">{{ saving ? '保存中...' : '保存' }}</button>
        <button class="profile__btn profile__btn--ghost" @click="editing = false">取消</button>
      </view>
    </view>

    <button class="profile__btn profile__btn--danger" @click="onLogout">退出登录</button>
    <FloatTabBar active="profile" />
  </view>
</template>

<style scoped>
.profile {
  padding: 28rpx 24rpx 200rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.profile__hero {
  padding: 34rpx;
  border-radius: 34rpx;
  color: #fff;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  box-shadow: 0 24rpx 64rpx rgba(20, 184, 166, 0.26);
}
.profile__title {
  display: block;
  font-size: 42rpx;
  font-weight: 800;
}
.profile__sub {
  display: block;
  margin-top: 8rpx;
  color: rgba(255, 255, 255, 0.76);
  font-size: 24rpx;
}
.profile__card {
  background: #fff;
  border-radius: 28rpx;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.profile__row {
  display: flex;
  justify-content: space-between;
  font-size: 28rpx;
}
.profile__section-title {
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
}
.profile__input {
  border-bottom: 1rpx solid #ddd;
  padding: 16rpx 0;
  font-size: 28rpx;
}
.profile__btn {
  background: linear-gradient(135deg, #14b8a6, #0f766e);
  color: #fff;
  border-radius: 999rpx;
  margin-top: 16rpx;
  font-weight: 700;
}
.profile__btn--ghost {
  background: #fff;
  color: #0f766e;
  border: 1rpx solid rgba(20, 184, 166, 0.3);
  box-shadow: none;
}
.profile__btn--danger {
  background: #ff4d4f;
}
</style>
