<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { getDashboardOverview, type DashboardOverviewVo } from '@/api/admin-dashboard';
import {
  getTimelineStats,
  type TimelineStatsVo,
  FOOD_ORDER_STATUS_LABEL,
  listFoodOrders,
} from '@/api/admin-food-orders';
import { getErrandStats, type AdminErrandStatsVo } from '@/api/admin-errand-orders';
import { listRiskExceptions, type RiskExceptionItemVo } from '@/api/admin-risk';

import PageContainer from '@/components/PageContainer.vue';
import StatCard from '@/components/StatCard.vue';
import StatusTag from '@/components/StatusTag.vue';
import EChart from './EChart.vue';

import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer,
]);

const loading = ref(false);
const overview = ref<DashboardOverviewVo | null>(null);
const foodStats = ref<TimelineStatsVo | null>(null);
const errandStats = ref<AdminErrandStatsVo | null>(null);
const exceptions = ref<RiskExceptionItemVo[]>([]);
const recentOrders = ref<Array<{ orderNo: string; status: string; amount: string; createdAt: number }>>([]);
let timer: number | undefined;

const gmvYuan = computed<string>(() => {
  if (!overview.value) return '0.00';
  return (Number(overview.value.gmv || 0) / 100).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
});

const errandTotalAmountYuan = computed<string>(() => {
  if (!errandStats.value) return '0.00';
  return (Number(errandStats.value.totalAmount || 0) / 100).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
});

// 跑腿订单状态分布饼图
const errandPieOption = computed(() => {
  const s = errandStats.value;
  const data = s
    ? [
        { name: '待支付', value: s.waitPayCount },
        { name: '已支付', value: s.paidCount },
        { name: '派单中', value: s.dispatchingCount },
        { name: '已指派', value: s.assignedCount },
        { name: '已送达', value: s.deliveredCount },
        { name: '已完成', value: s.completedCount },
        { name: '已取消', value: s.cancelledCount },
      ].filter((d) => d.value > 0)
    : [];
  return {
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 0,
      icon: 'circle',
      textStyle: { color: '#98a3b6', fontSize: 12 },
    },
    series: [
      {
        type: 'pie',
        radius: ['52%', '76%'],
        center: ['50%', '46%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: 'transparent', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: '500', color: '#e6edf7' } },
        data,
        color: ['#f59e0b', '#2e9c5d', '#a855f7', '#60a5fa', '#22c55e', '#10b981', '#ef4444'],
      },
    ],
  };
});

// 外卖订单状态分布柱图
const foodBarOption = computed(() => {
  const s = foodStats.value;
  const categories = ['超时未支付', '商家超时', '配送中', '今日完成', '今日取消'];
  const values = s
    ? [
        s.waitPayOverdueCount,
        s.merchantAcceptOverdueCount,
        s.deliveringCount,
        s.completedTodayCount,
        s.cancelledTodayCount,
      ]
    : [0, 0, 0, 0, 0];
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: { color: '#98a3b6', fontSize: 11 },
      axisLine: { lineStyle: { color: '#2c3849' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#98a3b6', fontSize: 11 },
      splitLine: { lineStyle: { color: '#1f2937' } },
    },
    series: [
      {
        type: 'bar',
        barWidth: 28,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#5fbe7d' },
              { offset: 1, color: '#1f7a47' },
            ],
          },
        },
        data: values,
      },
    ],
  };
});

// 资源占用环图
const resourceOption = computed(() => {
  const onlineRiders = overview.value?.onlineRiders ?? 0;
  const exceptionOrders = overview.value?.exceptionOrders ?? 0;
  const activeUsers = overview.value?.activeUsers ?? 0;
  return {
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 0,
      icon: 'circle',
      textStyle: { color: '#98a3b6', fontSize: 12 },
    },
    series: [
      {
        type: 'pie',
        radius: ['62%', '82%'],
        center: ['50%', '46%'],
        itemStyle: { borderRadius: 6, borderColor: 'transparent', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, color: '#e6edf7' } },
        data: [
          { name: '在线骑手', value: onlineRiders },
          { name: '活跃用户', value: activeUsers },
          { name: '异常订单', value: exceptionOrders },
        ].filter((d) => d.value > 0),
        color: ['#22c55e', '#60a5fa', '#ef4444'],
      },
    ],
  };
});

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  return p.catch(() => fallback);
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const [ov, fs, es, ex, rc] = await Promise.all([
      safe(getDashboardOverview(), { code: '1', message: '', data: null, traceId: '', timestamp: 0 }),
      safe(getTimelineStats(), { code: '1', message: '', data: null, traceId: '', timestamp: 0 }),
      safe(getErrandStats(), { code: '1', message: '', data: null, traceId: '', timestamp: 0 }),
      safe(listRiskExceptions({ status: 'OPEN', pageNo: 1, pageSize: 8 }), {
        code: '1',
        message: '',
        data: null,
        traceId: '',
        timestamp: 0,
      }),
      safe(listFoodOrders({ pageNo: 1, pageSize: 8 }), {
        code: '1',
        message: '',
        data: null,
        traceId: '',
        timestamp: 0,
      }),
    ]);
    if (ov.code === '0' && ov.data) overview.value = ov.data;
    if (fs.code === '0' && fs.data) foodStats.value = fs.data;
    if (es.code === '0' && es.data) errandStats.value = es.data;
    if (ex.code === '0' && ex.data) exceptions.value = ex.data.items;
    if (rc.code === '0' && rc.data) {
      recentOrders.value = rc.data.list.map((o) => ({
        orderNo: o.orderNo,
        status: o.status,
        amount: o.payableAmount,
        createdAt: o.createdAt,
      }));
    }
  } finally {
    loading.value = false;
  }
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function statusLabel(s: string): string {
  return (FOOD_ORDER_STATUS_LABEL as Record<string, string>)[s] ?? s;
}

onMounted(() => {
  void load();
  // 30 秒自动刷新
  timer = window.setInterval(() => void load(), 30_000);
});
onUnmounted(() => {
  if (timer) window.clearInterval(timer);
});
</script>

<template>
  <PageContainer title="数据大屏" subtitle="实时聚合 · 每 30 秒自动刷新">
    <template #extra>
      <el-button :loading="loading" @click="load">
        <el-icon><Refresh /></el-icon>
        <span style="margin-left: 6px">立即刷新</span>
      </el-button>
    </template>

    <!-- KPI Cards -->
    <section class="kpi-row">
      <StatCard label="今日 GMV" :value="gmvYuan" unit="元" tone="brand" :loading="loading && !overview" />
      <StatCard label="订单数 (今)" :value="overview?.orderCount ?? '—'" tone="info" :loading="loading && !overview" />
      <StatCard label="活跃用户" :value="overview?.activeUsers ?? '—'" tone="info" :loading="loading && !overview" />
      <StatCard
        label="在线骑手"
        :value="overview?.onlineRiders ?? '—'"
        tone="success"
        :loading="loading && !overview"
      />
      <StatCard
        label="异常订单"
        :value="overview?.exceptionOrders ?? '—'"
        tone="danger"
        :loading="loading && !overview"
        hint="risk_exception_log OPEN"
      />
      <StatCard
        label="跑腿总额"
        :value="errandTotalAmountYuan"
        unit="元"
        tone="warning"
        :loading="loading && !errandStats"
        :hint="errandStats ? `${errandStats.totalCount} 单` : ''"
      />
    </section>

    <!-- Charts Row -->
    <section class="chart-row">
      <div class="card-surface chart">
        <header class="chart__head">
          <h3 class="chart__title">外卖订单分布</h3>
          <span class="chart__sub">timeline statistics</span>
        </header>
        <div class="chart__body">
          <EChart :option="foodBarOption" :loading="loading && !foodStats" height="260px" />
        </div>
      </div>
      <div class="card-surface chart">
        <header class="chart__head">
          <h3 class="chart__title">跑腿订单状态</h3>
          <span class="chart__sub">{{ errandStats?.totalCount ?? 0 }} 单</span>
        </header>
        <div class="chart__body">
          <EChart :option="errandPieOption" :loading="loading && !errandStats" height="260px" />
        </div>
      </div>
      <div class="card-surface chart">
        <header class="chart__head">
          <h3 class="chart__title">资源态势</h3>
          <span class="chart__sub">用户 / 骑手 / 异常</span>
        </header>
        <div class="chart__body">
          <EChart :option="resourceOption" :loading="loading && !overview" height="260px" />
        </div>
      </div>
    </section>

    <!-- Lists Row -->
    <section class="row-2col">
      <div class="card-surface block">
        <header class="block__head">
          <h3 class="block__title">最近外卖订单</h3>
          <span class="block__sub">最新 8 条</span>
        </header>
        <table class="mini-table">
          <thead>
            <tr>
              <th>订单号</th>
              <th>状态</th>
              <th style="text-align: right">金额</th>
              <th style="text-align: right">时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in recentOrders" :key="o.orderNo">
              <td class="mono">{{ o.orderNo }}</td>
              <td><StatusTag :status="o.status" :label="statusLabel(o.status)" /></td>
              <td class="mono right">{{ (Number(o.amount || 0) / 100).toFixed(2) }} 元</td>
              <td class="muted right">{{ fmtTime(o.createdAt) }}</td>
            </tr>
            <tr v-if="recentOrders.length === 0">
              <td colspan="4" class="empty">暂无订单</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card-surface block">
        <header class="block__head">
          <h3 class="block__title">异常订单流水</h3>
          <span class="block__sub">最近 8 条 OPEN</span>
        </header>
        <table class="mini-table">
          <thead>
            <tr>
              <th>类型</th>
              <th>业务单</th>
              <th>严重度</th>
              <th style="text-align: right">时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ex in exceptions" :key="ex.logId">
              <td><StatusTag :status="ex.exceptionType" /></td>
              <td class="mono">{{ ex.bizType }}/{{ ex.bizOrderId }}</td>
              <td>
                <StatusTag
                  :status="ex.severity"
                  :tone="ex.severity === 'HIGH' ? 'danger' : ex.severity === 'MEDIUM' ? 'warning' : 'neutral'"
                />
              </td>
              <td class="muted right">{{ fmtTime(ex.createdAt) }}</td>
            </tr>
            <tr v-if="exceptions.length === 0">
              <td colspan="4" class="empty">暂无异常</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </PageContainer>
</template>

<style scoped>
.kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: var(--gap-4);
}
.chart-row {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: var(--gap-4);
}
@media (max-width: 1200px) {
  .chart-row {
    grid-template-columns: 1fr;
  }
}
.chart {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.chart__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border-default);
}
.chart__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--fg-primary);
  margin: 0;
}
.chart__sub {
  font-size: 12px;
  color: var(--fg-muted);
}
.chart__body {
  padding: 16px;
}

.row-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gap-4);
}
@media (max-width: 1100px) {
  .row-2col {
    grid-template-columns: 1fr;
  }
}
.block {
  display: flex;
  flex-direction: column;
}
.block__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border-default);
}
.block__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--fg-primary);
  margin: 0;
}
.block__sub {
  font-size: 12px;
  color: var(--fg-muted);
}

.mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.mini-table th {
  text-align: left;
  font-weight: 500;
  font-size: 11px;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--fg-muted);
  padding: 12px 20px;
  background: var(--bg-sunken);
  border-top: 1px solid var(--border-default);
  border-bottom: 1px solid var(--border-default);
}
.mini-table td {
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-muted);
  color: var(--fg-primary);
}
.mini-table tr:last-child td {
  border-bottom: none;
}
.mini-table .right {
  text-align: right;
}
.mini-table .muted {
  color: var(--fg-muted);
}
.mini-table .mono {
  font-family: var(--font-mono);
  font-size: 12px;
}
.mini-table .empty {
  text-align: center;
  color: var(--fg-muted);
  padding: 32px 20px;
}
</style>
