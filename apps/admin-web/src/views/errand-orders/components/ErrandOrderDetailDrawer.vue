<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { type AdminErrandOrderDetailVo, getErrandOrderDetail } from '@/api/admin-errand-orders';
import { type AdminOrderTimelineVo, type AdminTimelineItemVo, getAdminOrderTimeline } from '@/api/admin-orders';
import { type AdminPaymentVo, getAdminPaymentDetail } from '@/api/admin-payment';

const props = defineProps<{ visible: boolean; orderId: string | null }>();
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void }>();

const detail = ref<AdminErrandOrderDetailVo | null>(null);
const orderTimeline = ref<AdminOrderTimelineVo | null>(null);
const paymentDetail = ref<AdminPaymentVo | null>(null);
const loading = ref(false);
const paymentLoading = ref(false);

const STATUS_LABEL: Record<string, string> = {
  WAIT_PAY: '待支付',
  PAID: '已支付',
  DISPATCHING: '派单中',
  ASSIGNED: '已接单',
  PICKED_UP: '已取件',
  DELIVERED: '已送达',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

async function load(id: string): Promise<void> {
  loading.value = true;
  detail.value = null;
  orderTimeline.value = null;
  paymentDetail.value = null;
  try {
    const [detailResult, timelineResult] = await Promise.allSettled([
      getErrandOrderDetail(id),
      getAdminOrderTimeline('ERRAND', id),
    ]);
    if (detailResult.status === 'fulfilled' && detailResult.value.code === '0' && detailResult.value.data) {
      detail.value = detailResult.value.data;
    }
    if (timelineResult.status === 'fulfilled' && timelineResult.value.code === '0' && timelineResult.value.data) {
      orderTimeline.value = timelineResult.value.data;
    }
    const payOrderId = currentPayOrderId();
    if (payOrderId) void loadPaymentDetail(payOrderId);
  } finally {
    loading.value = false;
  }
}

function currentPayOrderId(): string | null {
  return detail.value?.payOrderId ?? orderTimeline.value?.paymentLogs[0]?.payOrderId ?? null;
}

async function loadPaymentDetail(payOrderId = currentPayOrderId()): Promise<void> {
  if (!payOrderId) return;
  paymentLoading.value = true;
  try {
    const r = await getAdminPaymentDetail(payOrderId);
    if (r.code === '0' && r.data) paymentDetail.value = r.data;
  } catch {
    paymentDetail.value = null;
  } finally {
    paymentLoading.value = false;
  }
}

watch(
  () => [props.visible, props.orderId] as const,
  ([v, id]) => {
    if (!v || !id) {
      detail.value = null;
      orderTimeline.value = null;
      paymentDetail.value = null;
      return;
    }
    void load(id);
  },
);

function close(): void {
  emit('update:visible', false);
}

const fmtDate = (ts: number | null | undefined): string => (ts ? new Date(ts).toLocaleString() : '-');
const fmtYuan = (cents: string): string => (Number(cents) / 100).toFixed(2);
const statusLabel = (status: string | null | undefined): string => (status ? (STATUS_LABEL[status] ?? status) : '-');

const displayTimeline = computed<AdminTimelineItemVo[]>(() => {
  if (orderTimeline.value) return orderTimeline.value.timeline;
  return (
    detail.value?.timeline.map((t) => ({
      at: t.createdAt,
      fromStatus: null,
      toStatus: t.eventType,
      actor: t.operator,
      reason: t.payload ? JSON.stringify(t.payload) : null,
    })) ?? []
  );
});
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
      <p>状态:{{ statusLabel(detail.status) }}</p>
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

      <div class="section-header">
        <h4>支付信息</h4>
        <el-button v-if="currentPayOrderId()" size="small" :loading="paymentLoading" @click="void loadPaymentDetail()">
          刷新支付单详情
        </el-button>
      </div>
      <el-descriptions v-if="paymentDetail" v-loading="paymentLoading" :column="1" border>
        <el-descriptions-item label="支付单 ID">{{ paymentDetail.payOrderId }}</el-descriptions-item>
        <el-descriptions-item label="支付状态">{{ paymentDetail.payStatus }}</el-descriptions-item>
        <el-descriptions-item label="支付金额">¥ {{ fmtYuan(paymentDetail.amountFen) }}</el-descriptions-item>
        <el-descriptions-item label="渠道">{{ paymentDetail.channel }}</el-descriptions-item>
        <el-descriptions-item label="三方流水">{{ paymentDetail.thirdPartyTradeNo ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="支付时间">{{ fmtDate(paymentDetail.paidAt) }}</el-descriptions-item>
        <el-descriptions-item label="回调日志">
          <div v-if="paymentDetail.callbackLogs.length" class="callback-logs">
            <div v-for="(log, i) in paymentDetail.callbackLogs" :key="i" class="callback-log">
              <div>解析时间: {{ fmtDate(log.parsedAt) }}</div>
              <pre>{{ log.raw ?? '-' }}</pre>
            </div>
          </div>
          <span v-else>-</span>
        </el-descriptions-item>
      </el-descriptions>
      <el-empty v-else-if="!currentPayOrderId()" description="无支付记录" />
      <div v-else v-loading="paymentLoading" class="pay-placeholder">支付单 ID: {{ currentPayOrderId() }}</div>

      <h4 v-if="detail.task">骑手任务</h4>
      <p v-if="detail.task">
        Task {{ detail.task.taskId }} · 状态 {{ detail.task.status }} · 骑手 {{ detail.task.riderId ?? '-' }}
      </p>

      <h4>平台统一时间线</h4>
      <el-timeline v-if="displayTimeline.length">
        <el-timeline-item v-for="(t, i) in displayTimeline" :key="i" :timestamp="fmtDate(t.at)">
          {{ statusLabel(t.fromStatus) }} → {{ statusLabel(t.toStatus) }}
          <small class="muted">{{ t.actor }}{{ t.reason ? ' / ' + t.reason : '' }}</small>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无时间线" />

      <el-collapse v-if="orderTimeline" class="mt-12">
        <el-collapse-item :title="`操作日志 (${orderTimeline.operatorLogs.length})`" name="operators">
          <el-table :data="orderTimeline.operatorLogs" size="small" border>
            <el-table-column label="时间" width="170">
              <template #default="{ row }">{{ fmtDate(row.at) }}</template>
            </el-table-column>
            <el-table-column prop="operatorType" label="操作方" width="90" />
            <el-table-column prop="operatorId" label="操作人" width="120" />
            <el-table-column label="状态变更" width="180">
              <template #default="{ row }"
                >{{ statusLabel(row.beforeStatus) }} → {{ statusLabel(row.afterStatus) }}</template
              >
            </el-table-column>
            <el-table-column prop="summary" label="摘要" />
          </el-table>
        </el-collapse-item>
        <el-collapse-item :title="`调度日志 (${orderTimeline.dispatchLogs.length})`" name="dispatch">
          <el-table :data="orderTimeline.dispatchLogs" size="small" border>
            <el-table-column label="时间" width="170">
              <template #default="{ row }">{{ fmtDate(row.at) }}</template>
            </el-table-column>
            <el-table-column prop="dispatchTaskId" label="任务 ID" width="120" />
            <el-table-column prop="riderId" label="骑手 ID" width="120" />
            <el-table-column label="状态变更" width="180">
              <template #default="{ row }">{{ row.beforeStatus }} → {{ row.afterStatus }}</template>
            </el-table-column>
            <el-table-column prop="reason" label="原因" />
          </el-table>
        </el-collapse-item>
        <el-collapse-item :title="`支付日志 (${orderTimeline.paymentLogs.length})`" name="payments">
          <el-table :data="orderTimeline.paymentLogs" size="small" border>
            <el-table-column prop="payOrderNo" label="支付单号" width="180" />
            <el-table-column prop="channel" label="渠道" width="100" />
            <el-table-column prop="status" label="状态" width="100" />
            <el-table-column label="实付" width="100">
              <template #default="{ row }">{{ row.paidAmount ? `¥ ${fmtYuan(row.paidAmount)}` : '-' }}</template>
            </el-table-column>
            <el-table-column label="支付时间" width="170">
              <template #default="{ row }">{{ fmtDate(row.paidAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="90">
              <template #default="{ row }">
                <el-button link type="primary" @click="void loadPaymentDetail(row.payOrderId)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-collapse-item>
      </el-collapse>
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
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.pay-placeholder {
  padding: 8px 0;
  color: #666;
}
.muted {
  margin-left: 8px;
  color: #999;
}
.mt-12 {
  margin-top: 12px;
}
.callback-logs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.callback-log pre {
  max-height: 120px;
  overflow: auto;
  margin: 4px 0 0;
  padding: 8px;
  background: #f7f7f7;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
