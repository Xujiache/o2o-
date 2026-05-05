<script setup lang="ts">
import { ref, watch } from 'vue';

import { type AdminErrandOrderDetailVo, getErrandOrderDetail } from '@/api/admin-errand-orders';

const props = defineProps<{ visible: boolean; orderId: string | null }>();
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void }>();

const detail = ref<AdminErrandOrderDetailVo | null>(null);
const loading = ref(false);

watch(
  () => [props.visible, props.orderId] as const,
  async ([v, id]) => {
    if (!v || !id) {
      detail.value = null;
      return;
    }
    loading.value = true;
    try {
      const r = await getErrandOrderDetail(id);
      if (r.code === '0' && r.data) detail.value = r.data;
    } finally {
      loading.value = false;
    }
  },
);

function close(): void {
  emit('update:visible', false);
}

const fmtDate = (ts: number): string => new Date(ts).toLocaleString();
const fmtYuan = (cents: string): string => (Number(cents) / 100).toFixed(2);
</script>

<template>
  <el-drawer
    :model-value="visible"
    :before-close="close"
    title="跑腿订单详情"
    size="640px"
    @update:model-value="emit('update:visible', $event)"
  >
    <div v-if="loading">加载中...</div>
    <div v-else-if="!detail">未选择</div>
    <div v-else class="errand-detail">
      <h4>基础信息</h4>
      <p>订单号:{{ detail.orderNo }}</p>
      <p>类型:{{ detail.typeCode }}</p>
      <p>状态:{{ detail.status }}</p>
      <p>紧急度:{{ detail.urgentLevel }}</p>
      <p>客户:{{ detail.customerId }}</p>
      <p>创建:{{ fmtDate(detail.createdAt) }}</p>
      <p v-if="detail.paidAt">支付:{{ fmtDate(detail.paidAt) }}</p>
      <p v-if="detail.cancelledAt">取消:{{ fmtDate(detail.cancelledAt) }}({{ detail.cancelReason }})</p>

      <h4>地址</h4>
      <p>取货:{{ JSON.stringify(detail.pickupAddress) }}</p>
      <p>送达:{{ JSON.stringify(detail.deliveryAddress) }}</p>
      <p v-if="detail.itemDesc">物品:{{ detail.itemDesc }}</p>
      <p v-if="detail.taskDesc">任务:{{ detail.taskDesc }}</p>
      <p>距离:{{ detail.distanceMeters }} m</p>

      <h4>价格</h4>
      <p>基础费 ¥{{ fmtYuan(detail.baseFee) }}</p>
      <p>距离费 ¥{{ fmtYuan(detail.distanceFee) }}</p>
      <p>加急/重量费 ¥{{ fmtYuan(detail.urgentFee) }}</p>
      <p>
        <b>应付 ¥{{ fmtYuan(detail.payableAmount) }}</b>
      </p>

      <h4 v-if="detail.task">骑手任务</h4>
      <p v-if="detail.task">
        Task {{ detail.task.taskId }} · 状态 {{ detail.task.status }} · 骑手 {{ detail.task.riderId ?? '-' }}
      </p>

      <h4>时间线</h4>
      <el-timeline>
        <el-timeline-item v-for="(t, i) in detail.timeline" :key="i" :timestamp="fmtDate(t.createdAt)">
          {{ t.eventType }} ({{ t.operator }})
        </el-timeline-item>
      </el-timeline>
    </div>
  </el-drawer>
</template>

<style scoped>
.errand-detail h4 {
  margin-top: 16px;
  margin-bottom: 8px;
}
.errand-detail p {
  margin: 4px 0;
  line-height: 1.5;
}
</style>
