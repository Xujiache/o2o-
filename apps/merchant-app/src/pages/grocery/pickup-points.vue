<script setup lang="ts">
/**
 * 自提点管理 — 列表 + 弹层新建 / 编辑
 *  - 列表 GET /m/pickup-points
 *  - 新建 POST /m/pickup-points
 *  - 编辑 PATCH /m/pickup-points/:id
 *  - 跳"时段配置"页传 pointId
 */
import { onShow } from '@dcloudio/uni-app';
import { onMounted, ref } from 'vue';

import { createPickupPoint, listPickupPoints, type PickupPointVo, updatePickupPoint } from '@/api/grocery';
import SvgIcon from '@/components/common/SvgIcon.vue';

const list = ref<PickupPointVo[]>([]);
const loading = ref(false);

// 编辑弹层
const editing = ref<PickupPointVo | null>(null);
const isCreating = ref(false);
const form = ref({
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  address: '',
  lng: 0,
  lat: 0,
});
const submitting = ref(false);

onMounted(() => {
  void load();
});

onShow(() => uni.hideTabBar({ animation: false }));

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await listPickupPoints();
    if (r.code === '0' && r.data) list.value = r.data;
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  isCreating.value = true;
  editing.value = null;
  form.value = {
    name: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    address: '',
    lng: 0,
    lat: 0,
  };
}

function openEdit(p: PickupPointVo): void {
  isCreating.value = false;
  editing.value = p;
  form.value = {
    name: p.name,
    phone: p.phone,
    province: p.province,
    city: p.city,
    district: p.district,
    address: p.address,
    lng: p.lng,
    lat: p.lat,
  };
}

function closeModal(): void {
  editing.value = null;
  isCreating.value = false;
}

function inputValue(e: Event): string {
  return (e as unknown as { detail: { value: string } }).detail?.value ?? '';
}
function setLng(e: Event): void {
  form.value.lng = Number(inputValue(e)) || 0;
}
function setLat(e: Event): void {
  form.value.lat = Number(inputValue(e)) || 0;
}

function pickLocation(): void {
  uni.chooseLocation?.({
    success: (res) => {
      form.value.lng = res.longitude;
      form.value.lat = res.latitude;
      // 尝试把 address 自动填进去(若用户没填)
      if (!form.value.address && res.address) form.value.address = res.address;
      if (!form.value.name && res.name) form.value.name = res.name;
    },
    fail: () => {
      uni.showToast({ title: '该平台不支持定位选点,请手输经纬度', icon: 'none' });
    },
  });
}

const canSubmit = () => {
  const f = form.value;
  return (
    f.name.trim() &&
    f.phone.trim() &&
    f.province.trim() &&
    f.city.trim() &&
    f.district.trim() &&
    f.address.trim() &&
    Number.isFinite(f.lng) &&
    Number.isFinite(f.lat) &&
    f.lng !== 0 &&
    f.lat !== 0
  );
};

async function onSubmit(): Promise<void> {
  if (!canSubmit() || submitting.value) {
    if (!canSubmit()) uni.showToast({ title: '请补全所有必填项', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    if (isCreating.value) {
      const r = await createPickupPoint(form.value);
      if (r.code === '0') {
        uni.showToast({ title: '已创建', icon: 'success' });
        closeModal();
        await load();
      }
    } else if (editing.value) {
      const r = await updatePickupPoint(editing.value.pickupPointId, form.value);
      if (r.code === '0') {
        uni.showToast({ title: '已保存', icon: 'success' });
        closeModal();
        await load();
      }
    }
  } finally {
    submitting.value = false;
  }
}

async function onToggleStatus(p: PickupPointVo): Promise<void> {
  const target = p.status === 1 ? 0 : 1;
  const r = await updatePickupPoint(p.pickupPointId, { status: target });
  if (r.code === '0') {
    uni.showToast({ title: target === 1 ? '已启用' : '已停用', icon: 'success' });
    await load();
  }
}

function gotoSlots(p: PickupPointVo): void {
  uni.navigateTo({ url: `/pages/grocery/pickup-slots?pointId=${p.pickupPointId}&name=${encodeURIComponent(p.name)}` });
}
</script>

<template>
  <view class="pp">
    <view class="pp__head">
      <view class="pp__head-l">
        <text class="pp__title">自提点管理</text>
        <text class="pp__sub">共 {{ list.length }} 个</text>
      </view>
      <view class="pp__head-r" @tap="openCreate">
        <SvgIcon name="plus" :size="20" color="#fff" />
        <text>新建</text>
      </view>
    </view>

    <view v-if="loading && list.length === 0" class="pp__msg">加载中…</view>
    <view v-else-if="list.length === 0" class="pp__empty">
      <SvgIcon name="location-pin" :size="100" color="#dde2ea" />
      <text>还没有自提点,点击右上角新建</text>
    </view>

    <view v-else class="pp__list">
      <view v-for="p in list" :key="p.pickupPointId" class="pp__card">
        <view class="pp__card-head">
          <view class="pp__card-head-l">
            <SvgIcon name="location-pin" :size="20" color="#b7791f" />
            <text class="pp__card-name">{{ p.name }}</text>
          </view>
          <text class="pp__card-status" :class="p.status === 1 ? 'pp__card-status--on' : 'pp__card-status--off'">
            {{ p.status === 1 ? '启用中' : '已停用' }}
          </text>
        </view>
        <view class="pp__card-body">
          <view class="pp__card-row">
            <text class="pp__card-label">电话</text>
            <text class="pp__card-val">{{ p.phone }}</text>
          </view>
          <view class="pp__card-row">
            <text class="pp__card-label">地址</text>
            <text class="pp__card-val">{{ p.province }}{{ p.city }}{{ p.district }}{{ p.address }}</text>
          </view>
          <view class="pp__card-row">
            <text class="pp__card-label">经纬度</text>
            <text class="pp__card-val">{{ p.lng.toFixed(6) }}, {{ p.lat.toFixed(6) }}</text>
          </view>
        </view>
        <view class="pp__card-acts">
          <view class="pp__card-act pp__card-act--ghost" @tap="onToggleStatus(p)">
            {{ p.status === 1 ? '停用' : '启用' }}
          </view>
          <view class="pp__card-act pp__card-act--ghost" @tap="openEdit(p)">编辑</view>
          <view class="pp__card-act pp__card-act--primary" @tap="gotoSlots(p)">配时段</view>
        </view>
      </view>
    </view>

    <!-- 弹层 -->
    <view v-if="editing || isCreating" class="pp__modal">
      <view class="pp__modal-mask" @tap="closeModal" />
      <view class="pp__modal-panel">
        <view class="pp__modal-head">
          <text class="pp__modal-title">{{ isCreating ? '新建自提点' : '编辑自提点' }}</text>
          <SvgIcon name="x" :size="24" color="#8a94a6" @tap="closeModal" />
        </view>

        <scroll-view class="pp__modal-body" scroll-y>
          <view class="pp__form-row">
            <text class="pp__form-label">名称</text>
            <input class="pp__form-input" v-model="form.name" placeholder="如:总店仓库" maxlength="64" />
          </view>
          <view class="pp__form-row">
            <text class="pp__form-label">联系电话</text>
            <input class="pp__form-input" v-model="form.phone" placeholder="如:13800000000" maxlength="20" />
          </view>
          <view class="pp__form-row pp__form-row--3">
            <view class="pp__form-cell">
              <text class="pp__form-label">省</text>
              <input class="pp__form-input" v-model="form.province" placeholder="省" />
            </view>
            <view class="pp__form-cell">
              <text class="pp__form-label">市</text>
              <input class="pp__form-input" v-model="form.city" placeholder="市" />
            </view>
            <view class="pp__form-cell">
              <text class="pp__form-label">区</text>
              <input class="pp__form-input" v-model="form.district" placeholder="区" />
            </view>
          </view>
          <view class="pp__form-row">
            <text class="pp__form-label">详细地址</text>
            <input class="pp__form-input" v-model="form.address" placeholder="街道门牌号" maxlength="255" />
          </view>
          <view class="pp__form-row">
            <text class="pp__form-label">经纬度</text>
            <view class="pp__form-loc">
              <input
                class="pp__form-input pp__form-loc-input"
                type="digit"
                :value="form.lng"
                placeholder="经度"
                @input="setLng"
              />
              <input
                class="pp__form-input pp__form-loc-input"
                type="digit"
                :value="form.lat"
                placeholder="纬度"
                @input="setLat"
              />
              <view class="pp__form-loc-btn" @tap="pickLocation">
                <SvgIcon name="location-pin" :size="18" color="#fff" />
                <text>定位</text>
              </view>
            </view>
          </view>
        </scroll-view>

        <view class="pp__modal-foot">
          <view class="pp__modal-btn pp__modal-btn--ghost" @tap="closeModal">取消</view>
          <view
            class="pp__modal-btn pp__modal-btn--primary"
            :class="{ 'pp__modal-btn--disabled': submitting }"
            @tap="onSubmit"
          >
            <text>{{ submitting ? '提交中…' : isCreating ? '创建' : '保存' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.pp {
  min-height: 100vh;
  padding: 24rpx 24rpx 200rpx;
  background: #f5f6f8;
}
.pp__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4rpx;
}
.pp__head-l {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.pp__title {
  font-size: 36rpx;
  font-weight: 800;
  color: #172033;
}
.pp__sub {
  font-size: 22rpx;
  color: #8a94a6;
}
.pp__head-r {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 22rpx;
  background: #b7791f;
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
  border-radius: 8rpx;
}

.pp__msg {
  text-align: center;
  padding: 100rpx 0;
  color: #8a94a6;
  font-size: 24rpx;
}
.pp__empty {
  padding: 120rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  color: #8a94a6;
  font-size: 24rpx;
}

.pp__list {
  margin-top: 14rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}
.pp__card {
  background: #fff;
  border: 1rpx solid #e6e9ee;
  border-radius: 12rpx;
  overflow: hidden;
}
.pp__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 22rpx;
  background: #fafbfc;
  border-bottom: 1rpx solid #f0f1f3;
}
.pp__card-head-l {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.pp__card-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #172033;
}
.pp__card-status {
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  font-size: 20rpx;
  font-weight: 700;
}
.pp__card-status--on {
  color: #11865c;
  background: #e9f7ef;
}
.pp__card-status--off {
  color: #8a94a6;
  background: #f0f1f3;
}
.pp__card-body {
  padding: 14rpx 22rpx;
}
.pp__card-row {
  display: flex;
  gap: 12rpx;
  padding: 4rpx 0;
}
.pp__card-label {
  width: 100rpx;
  font-size: 22rpx;
  color: #8a94a6;
  flex-shrink: 0;
}
.pp__card-val {
  flex: 1;
  font-size: 22rpx;
  color: #172033;
}
.pp__card-acts {
  display: flex;
  gap: 12rpx;
  padding: 0 22rpx 18rpx;
}
.pp__card-act {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-radius: 8rpx;
  font-size: 24rpx;
  font-weight: 700;
}
.pp__card-act--ghost {
  background: #fff;
  color: #5a6275;
  border: 1rpx solid #d8dde4;
}
.pp__card-act--primary {
  background: #b7791f;
  color: #fff;
}

/* 弹层 */
.pp__modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.pp__modal-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}
.pp__modal-panel {
  position: relative;
  width: 100%;
  max-height: 80vh;
  background: #fff;
  border-radius: 20rpx 20rpx 0 0;
  display: flex;
  flex-direction: column;
}
.pp__modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid #f0f1f3;
}
.pp__modal-title {
  font-size: 30rpx;
  font-weight: 800;
  color: #172033;
}
.pp__modal-body {
  flex: 1;
  padding: 16rpx 28rpx;
}
.pp__form-row {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 16rpx;
}
.pp__form-row--3 {
  flex-direction: row;
  gap: 12rpx;
}
.pp__form-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.pp__form-label {
  font-size: 22rpx;
  color: #5a6275;
  font-weight: 600;
}
.pp__form-input {
  padding: 14rpx;
  background: #f7f8fa;
  border: 1rpx solid #e6e9ee;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #172033;
}
.pp__form-loc {
  display: flex;
  gap: 10rpx;
  align-items: center;
}
.pp__form-loc-input {
  flex: 1;
  min-width: 0;
}
.pp__form-loc-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 18rpx;
  background: #b7791f;
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
  border-radius: 8rpx;
  flex-shrink: 0;
}
.pp__modal-foot {
  display: flex;
  gap: 12rpx;
  padding: 16rpx 28rpx calc(16rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #f0f1f3;
}
.pp__modal-btn {
  flex: 1;
  padding: 22rpx 0;
  border-radius: 10rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 700;
}
.pp__modal-btn--ghost {
  background: #fff;
  color: #5a6275;
  border: 1rpx solid #d8dde4;
}
.pp__modal-btn--primary {
  background: #b7791f;
  color: #fff;
}
.pp__modal-btn--disabled {
  background: #dde2ea;
  color: #b6bfcd;
}
</style>
