<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { type AdminErrandOrderDetailVo, getErrandOrderDetail } from '@/api/admin-errand-orders';
import { type AdminOrderTimelineVo, type AdminTimelineItemVo, getAdminOrderTimeline } from '@/api/admin-orders';
import { type AdminPaymentVo, getAdminPaymentDetail } from '@/api/admin-payment';

import EmptyState from '@/components/EmptyState.vue';
import StatusTag from '@/components/StatusTag.vue';

const props = defineProps<{ visible: boolean; orderId: string | null }>();
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void }>();

const detail = ref<AdminErrandOrderDetailVo | null>(null);
const orderTimeline = ref<AdminOrderTimelineVo | null>(null);
const paymentDetail = ref<AdminPaymentVo | null>(null);
const paymentError = ref<string | null>(null);
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

const TYPE_LABEL: Record<string, string> = {
  BUY: '代买',
  DELIVER: '代送',
  HELP: '代办',
  CUSTOM: '自定义',
};

const URGENT_LABEL: Record<string, string> = {
  standard: '普通',
  fast: '加急',
  express: '特快',
};

async function load(id: string): Promise<void> {
  loading.value = true;
  detail.value = null;
  orderTimeline.value = null;
  paymentDetail.value = null;
  paymentError.value = null;
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
  paymentError.value = null;
  try {
    const r = await getAdminPaymentDetail(payOrderId);
    if (r.code === '0' && r.data) {
      paymentDetail.value = r.data;
    } else {
      paymentError.value = r.message || '加载支付单失败';
    }
  } catch (err) {
    paymentError.value = err instanceof Error ? err.message : '网络错误';
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
      paymentError.value = null;
      return;
    }
    void load(id);
  },
);

function close(): void {
  emit('update:visible', false);
}

const fmtDate = (ts: number | null | undefined): string => (ts ? new Date(ts).toLocaleString() : '—');
const fmtYuan = (cents: string | null | undefined): string =>
  cents === null || cents === undefined ? '—' : `${(Number(cents) / 100).toFixed(2)} 元`;
const fmtMeters = (m: number | null | undefined): string => {
  if (m === null || m === undefined) return '—';
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;
};
const statusLabel = (status: string | null | undefined): string => (status ? (STATUS_LABEL[status] ?? status) : '—');

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

const fmtAddr = (addr: Record<string, unknown> | null): string => {
  if (!addr) return '—';
  const a = addr as Record<string, string | undefined>;
  return (
    [a.contactName, a.contactMobile, a.cityName, a.districtName, a.detail].filter(Boolean).join(' · ') ||
    JSON.stringify(addr)
  );
};
</script>

<template>
  <el-drawer
    :model-value="visible"
    :before-close="close"
    title="跑腿订单详情"
    size="720px"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-skeleton v-if="loading" :rows="8" animated />
    <EmptyState v-else-if="!detail" title="未选择订单" icon="Tickets" />

    <div v-else class="errand-detail">
      <!-- 顶部摘要 -->
      <header class="summary">
        <div class="summary__main">
          <div class="summary__title">
            <span class="mono">{{ detail.orderNo }}</span>
            <StatusTag :status="detail.status" :label="statusLabel(detail.status)" />
          </div>
          <div class="summary__sub">
            <span class="chip">{{ TYPE_LABEL[detail.typeCode] || detail.typeCode }}</span>
            <span class="chip" :data-urgent="detail.urgentLevel">{{
              URGENT_LABEL[detail.urgentLevel] || detail.urgentLevel
            }}</span>
            <span class="muted">距离 {{ fmtMeters(detail.distanceMeters) }}</span>
          </div>
        </div>
        <div class="summary__amount">
          <div class="amount-label">应付</div>
          <div class="amount-value stat-num">{{ fmtYuan(detail.payableAmount) }}</div>
        </div>
      </header>

      <!-- 基础信息 -->
      <section class="block">
        <h4 class="block__title">基础信息</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="客户">
            <span class="mono">{{ detail.customerId }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="创建">
            <span class="muted">{{ fmtDate(detail.createdAt) }}</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.paidAt" label="支付">{{ fmtDate(detail.paidAt) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.reservedTime" label="预约">{{
            fmtDate(detail.reservedTime)
          }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.cancelledAt" label="取消" :span="2">
            {{ fmtDate(detail.cancelledAt) }} · {{ detail.cancelReason || '无原因' }}
          </el-descriptions-item>
        </el-descriptions>
      </section>

      <!-- 地址 -->
      <section class="block">
        <h4 class="block__title">地址</h4>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="取货">{{ fmtAddr(detail.pickupAddress) }}</el-descriptions-item>
          <el-descriptions-item label="送达">{{ fmtAddr(detail.deliveryAddress) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.itemDesc" label="物品">{{ detail.itemDesc }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.taskDesc" label="任务">{{ detail.taskDesc }}</el-descriptions-item>
        </el-descriptions>
      </section>

      <!-- 价格 -->
      <section class="block">
        <h4 class="block__title">价格构成</h4>
        <div class="price-row">
          <div class="price-cell">
            <div class="label">基础费</div>
            <div class="value stat-num">{{ fmtYuan(detail.baseFee) }}</div>
          </div>
          <div class="price-cell">
            <div class="label">距离费</div>
            <div class="value stat-num">{{ fmtYuan(detail.distanceFee) }}</div>
          </div>
          <div class="price-cell">
            <div class="label">加急 / 重量</div>
            <div class="value stat-num">{{ fmtYuan(detail.urgentFee) }}</div>
          </div>
          <div class="price-cell price-cell--total">
            <div class="label">应付</div>
            <div class="value stat-num">{{ fmtYuan(detail.payableAmount) }}</div>
          </div>
        </div>
      </section>

      <!-- 支付信息 -->
      <section class="block">
        <div class="block__head">
          <h4 class="block__title">支付信息</h4>
          <el-button
            v-if="currentPayOrderId()"
            size="small"
            :loading="paymentLoading"
            @click="void loadPaymentDetail()"
          >
            <el-icon><Refresh /></el-icon>
            <span style="margin-left: 4px">刷新</span>
          </el-button>
        </div>
        <el-skeleton v-if="paymentLoading && !paymentDetail" :rows="3" animated />
        <el-descriptions v-else-if="paymentDetail" :column="2" border>
          <el-descriptions-item label="支付单"
            ><span class="mono">{{ paymentDetail.payOrderId }}</span></el-descriptions-item
          >
          <el-descriptions-item label="状态">
            <StatusTag :status="paymentDetail.payStatus" />
          </el-descriptions-item>
          <el-descriptions-item label="金额">
            <span class="mono">{{ fmtYuan(paymentDetail.amountFen) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="渠道">{{ paymentDetail.channel }}</el-descriptions-item>
          <el-descriptions-item label="三方流水" :span="2">
            <span v-if="paymentDetail.thirdPartyTradeNo" class="mono">{{ paymentDetail.thirdPartyTradeNo }}</span>
            <span v-else class="muted">—</span>
          </el-descriptions-item>
          <el-descriptions-item label="支付时间" :span="2">{{ fmtDate(paymentDetail.paidAt) }}</el-descriptions-item>
          <el-descriptions-item v-if="paymentDetail.callbackLogs.length" label="回调日志" :span="2">
            <div class="callback-logs">
              <div v-for="(log, i) in paymentDetail.callbackLogs" :key="i" class="callback-log">
                <div class="callback-log__time muted">{{ fmtDate(log.parsedAt) }}</div>
                <pre class="callback-log__raw">{{ log.raw ?? '—' }}</pre>
              </div>
            </div>
          </el-descriptions-item>
        </el-descriptions>
        <EmptyState v-else-if="paymentError" title="支付单加载失败" :description="paymentError" icon="WarningFilled">
          <template #actions>
            <el-button type="primary" size="small" @click="void loadPaymentDetail()">重试</el-button>
          </template>
        </EmptyState>
        <EmptyState v-else title="无支付记录" icon="CreditCard" />
      </section>

      <!-- 骑手任务 -->
      <section v-if="detail.task" class="block">
        <h4 class="block__title">骑手任务</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="Task"
            ><span class="mono">{{ detail.task.taskId }}</span></el-descriptions-item
          >
          <el-descriptions-item label="状态">
            <StatusTag :status="detail.task.status" />
          </el-descriptions-item>
          <el-descriptions-item label="骑手">
            <span v-if="detail.task.riderId" class="mono">{{ detail.task.riderId }}</span>
            <span v-else class="muted">未派单</span>
          </el-descriptions-item>
          <el-descriptions-item label="派单次数">
            <span class="mono">{{ detail.task.dispatchCount }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="加价" :span="2">
            <span class="mono">{{ fmtYuan(detail.task.priceIncrease) }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </section>

      <!-- 时间线 -->
      <section class="block">
        <h4 class="block__title">时间线</h4>
        <el-timeline v-if="displayTimeline.length">
          <el-timeline-item v-for="(t, i) in displayTimeline" :key="i" :timestamp="fmtDate(t.at)" placement="top">
            <span>{{ statusLabel(t.fromStatus) }} → {{ statusLabel(t.toStatus) }}</span>
            <div v-if="t.actor || t.reason" class="muted ts-meta">
              {{ t.actor }}{{ t.reason ? ' · ' + t.reason : '' }}
            </div>
          </el-timeline-item>
        </el-timeline>
        <EmptyState v-else title="暂无时间线" />
      </section>

      <!-- 日志折叠 -->
      <el-collapse v-if="orderTimeline" class="logs">
        <el-collapse-item :title="`操作日志 (${orderTimeline.operatorLogs.length})`" name="operators">
          <el-table :data="orderTimeline.operatorLogs" size="small">
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
          <el-table :data="orderTimeline.dispatchLogs" size="small">
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
          <el-table :data="orderTimeline.paymentLogs" size="small">
            <el-table-column prop="payOrderNo" label="支付单号" width="180" />
            <el-table-column prop="channel" label="渠道" width="100" />
            <el-table-column prop="status" label="状态" width="100" />
            <el-table-column label="实付" width="100">
              <template #default="{ row }">{{ row.paidAmount ? fmtYuan(row.paidAmount) : '—' }}</template>
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
.errand-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  background: var(--bg-canvas);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
}
.summary__title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: var(--fg-primary);
}
.summary__sub {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}
.chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--bg-elevated);
  color: var(--fg-secondary);
  font-size: 12px;
}
.chip[data-urgent='fast'] {
  background: var(--status-warning-soft);
  color: var(--status-warning);
}
.chip[data-urgent='express'] {
  background: var(--status-danger-soft);
  color: var(--status-danger);
}
.summary__amount {
  text-align: right;
}
.amount-label {
  font-size: 11px;
  color: var(--fg-muted);
  letter-spacing: 0.4px;
  text-transform: uppercase;
}
.amount-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--brand-500);
}

.block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.block__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.block__title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-primary);
  letter-spacing: 0.3px;
}

.price-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.price-cell {
  padding: 12px 14px;
  background: var(--bg-canvas);
  border: 1px solid var(--border-default);
  border-radius: var(--radius);
}
.price-cell .label {
  font-size: 11px;
  color: var(--fg-muted);
  letter-spacing: 0.4px;
  text-transform: uppercase;
}
.price-cell .value {
  margin-top: 4px;
  font-size: 16px;
  font-weight: 600;
  color: var(--fg-primary);
}
.price-cell--total {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), transparent);
  border-color: rgba(59, 130, 246, 0.32);
}
.price-cell--total .value {
  color: var(--brand-500);
}

.callback-logs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.callback-log {
  border: 1px solid var(--border-default);
  border-radius: var(--radius);
  padding: 10px;
}
.callback-log__time {
  font-size: 11px;
  margin-bottom: 4px;
}
.callback-log__raw {
  margin: 0;
  padding: 8px 10px;
  background: var(--bg-canvas);
  border-radius: var(--radius-sm);
  color: var(--fg-secondary);
  font-family: var(--font-mono);
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 160px;
  overflow: auto;
}

.ts-meta {
  margin-top: 4px;
  font-size: 12px;
}

.mono {
  font-family: var(--font-mono);
  font-size: 12px;
}
.muted {
  color: var(--fg-muted);
}

.logs {
  margin-top: 4px;
}
</style>
