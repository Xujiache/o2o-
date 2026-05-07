<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import {
  type AdminFoodOrderDetailVo,
  FOOD_ORDER_STATUS_LABEL,
  type FoodOrderStatus,
  getFoodOrderDetail,
} from '@/api/admin-food-orders';
import { type AdminOrderTimelineVo, type AdminTimelineItemVo, getAdminOrderTimeline } from '@/api/admin-orders';
import { type AdminPaymentVo, getAdminPaymentDetail } from '@/api/admin-payment';

const props = defineProps<{ visible: boolean; orderId: string | null }>();
defineEmits<{
  (e: 'update:visible', v: boolean): void;
}>();

const detail = ref<AdminFoodOrderDetailVo | null>(null);
const orderTimeline = ref<AdminOrderTimelineVo | null>(null);
const paymentDetail = ref<AdminPaymentVo | null>(null);
const loading = ref(false);
const paymentLoading = ref(false);

async function load(): Promise<void> {
  if (!props.orderId) return;
  loading.value = true;
  detail.value = null;
  orderTimeline.value = null;
  paymentDetail.value = null;
  try {
    const [detailResult, timelineResult] = await Promise.allSettled([
      getFoodOrderDetail(props.orderId),
      getAdminOrderTimeline('FOOD', props.orderId),
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
  return detail.value?.payment?.payOrderId ?? orderTimeline.value?.paymentLogs[0]?.payOrderId ?? null;
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
  () => props.visible,
  (v) => {
    if (v && props.orderId) void load();
    if (!v) detail.value = null;
  },
);

const fmtDate = (ts: number | null | undefined): string => (ts ? new Date(ts).toLocaleString() : '-');
const fmtYuan = (cents: string): string => (Number(cents) / 100).toFixed(2);
const statusLabel = (status: string | null | undefined): string =>
  status ? (FOOD_ORDER_STATUS_LABEL[status as FoodOrderStatus] ?? status) : '-';

const displayTimeline = computed<AdminTimelineItemVo[]>(() => {
  if (orderTimeline.value) return orderTimeline.value.timeline;
  return (
    detail.value?.timeline.map((t) => ({
      at: t.createdAt,
      fromStatus: t.fromStatus ?? null,
      toStatus: t.toStatus,
      actor: t.actorType,
      reason: t.reason ?? null,
    })) ?? []
  );
});
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
            <el-tag>{{ statusLabel(detail.status) }}</el-tag>
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
        <div class="section-header">
          <h4>支付信息</h4>
          <el-button
            v-if="currentPayOrderId()"
            size="small"
            :loading="paymentLoading"
            @click="void loadPaymentDetail()"
          >
            刷新支付单详情
          </el-button>
        </div>
        <el-descriptions v-if="detail.payment" :column="1" border>
          <el-descriptions-item label="支付单 ID">{{ detail.payment.payOrderId }}</el-descriptions-item>
          <el-descriptions-item label="支付单号">{{ detail.payment.payOrderNo }}</el-descriptions-item>
          <el-descriptions-item label="渠道">{{ detail.payment.payChannel }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ detail.payment.status }}</el-descriptions-item>
          <el-descriptions-item label="渠道流水号">{{ detail.payment.channelTradeNo ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="支付时间">{{ fmtDate(detail.payment.paidAt) }}</el-descriptions-item>
        </el-descriptions>
        <el-empty v-else description="无支付记录" />

        <el-descriptions v-if="paymentDetail" v-loading="paymentLoading" :column="1" border class="mt-12">
          <el-descriptions-item label="支付单详情 ID">{{ paymentDetail.payOrderId }}</el-descriptions-item>
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

        <el-divider />
        <h4>平台统一时间线</h4>
        <el-timeline v-if="displayTimeline.length">
          <el-timeline-item v-for="(t, i) in displayTimeline" :key="i" :timestamp="fmtDate(t.at)">
            <span>{{ statusLabel(t.fromStatus) }} → {{ statusLabel(t.toStatus) }}</span>
            <small style="margin-left: 8px; color: #999">{{ t.actor }}{{ t.reason ? ' / ' + t.reason : '' }}</small>
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
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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
