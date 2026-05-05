<script setup lang="ts">
import { ref, watch } from 'vue';

import { type AdminFoodOrderDetailVo, getFoodOrderDetail } from '@/api/admin-food-orders';

const props = defineProps<{ visible: boolean; orderId: string | null }>();
defineEmits<{
  (e: 'update:visible', v: boolean): void;
}>();

const detail = ref<AdminFoodOrderDetailVo | null>(null);
const loading = ref(false);

async function load(): Promise<void> {
  if (!props.orderId) return;
  loading.value = true;
  try {
    const r = await getFoodOrderDetail(props.orderId);
    if (r.code === '0' && r.data) detail.value = r.data;
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.visible,
  (v) => {
    if (v && props.orderId) void load();
    if (!v) detail.value = null;
  },
);

const fmtDate = (ts: number | null | undefined): string => (ts ? new Date(ts).toLocaleString() : '-');
const fmtYuan = (cents: string): string => (Number(cents) / 100).toFixed(2);
</script>

<template>
  <el-drawer
    :model-value="visible"
    title="外卖订单详情"
    size="640px"
    @update:model-value="(v: boolean) => $emit('update:visible', v)"
  >
    <div v-loading="loading" class="drawer">
      <div v-if="detail">
        <el-descriptions :column="2" border title="基本信息">
          <el-descriptions-item label="订单号">{{ detail.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag>{{ detail.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="用户 id">{{ detail.customerId }}</el-descriptions-item>
          <el-descriptions-item label="店铺 id">{{ detail.storeId }}</el-descriptions-item>
          <el-descriptions-item label="城市">{{ detail.cityCode }}</el-descriptions-item>
          <el-descriptions-item label="支付状态">{{ detail.payStatus }}</el-descriptions-item>
          <el-descriptions-item label="商品金额">¥ {{ fmtYuan(detail.goodsAmount) }}</el-descriptions-item>
          <el-descriptions-item label="配送费">¥ {{ fmtYuan(detail.deliveryFee) }}</el-descriptions-item>
          <el-descriptions-item label="应付">¥ {{ fmtYuan(detail.payableAmount) }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ fmtDate(detail.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="支付时间">{{ fmtDate(detail.paidAt) }}</el-descriptions-item>
          <el-descriptions-item label="取消时间">{{ fmtDate(detail.cancelledAt) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.cancelledBy" label="取消方">{{ detail.cancelledBy }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.cancelledReason" label="取消原因">{{
            detail.cancelledReason
          }}</el-descriptions-item>
        </el-descriptions>

        <el-divider />
        <h4>支付信息</h4>
        <el-descriptions v-if="detail.payment" :column="1" border>
          <el-descriptions-item label="支付单号">{{ detail.payment.payOrderNo }}</el-descriptions-item>
          <el-descriptions-item label="渠道">{{ detail.payment.payChannel }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ detail.payment.status }}</el-descriptions-item>
          <el-descriptions-item label="渠道流水号">{{ detail.payment.channelTradeNo ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="支付时间">{{ fmtDate(detail.payment.paidAt) }}</el-descriptions-item>
        </el-descriptions>
        <el-empty v-else description="无支付记录" />

        <el-divider />
        <h4>状态时间线</h4>
        <el-timeline>
          <el-timeline-item v-for="(t, i) in detail.timeline" :key="i" :timestamp="fmtDate(t.createdAt)">
            <span>{{ t.fromStatus ?? 'NULL' }} → {{ t.toStatus }}</span>
            <small style="margin-left: 8px; color: #999">{{ t.actorType }}{{ t.reason ? ' / ' + t.reason : '' }}</small>
          </el-timeline-item>
        </el-timeline>
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
.drawer {
  padding: 16px;
}
h4 {
  margin: 12px 0;
}
</style>
