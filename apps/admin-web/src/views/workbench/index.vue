<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { getDashboardOverview, type DashboardOverviewVo } from '@/api/admin-dashboard';
import { getTimelineStats, type TimelineStatsVo } from '@/api/admin-food-orders';
import { getErrandStats, type AdminErrandStatsVo } from '@/api/admin-errand-orders';
import { listApplications } from '@/api/admin-merchants';
import { listRiders } from '@/api/admin-riders';
import { listRiskExceptions, type RiskExceptionItemVo } from '@/api/admin-risk';
import { listAfterSales } from '@/api/admin-after-sales';
import { listWithdrawals } from '@/api/admin-withdrawals';

import EmptyState from '@/components/EmptyState.vue';
import PageContainer from '@/components/PageContainer.vue';
import StatCard from '@/components/StatCard.vue';
import StatusTag from '@/components/StatusTag.vue';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const overview = ref<DashboardOverviewVo | null>(null);
const foodStats = ref<TimelineStatsVo | null>(null);
const errandStats = ref<AdminErrandStatsVo | null>(null);

const merchantPendingCount = ref<number>(0);
const riderPendingCount = ref<number>(0);
const afterSalePendingCount = ref<number>(0);
const withdrawalPendingCount = ref<number>(0);
const exceptions = ref<RiskExceptionItemVo[]>([]);

const principalLabel = computed<string>(
  () => userStore.principal?.displayName ?? userStore.principal?.username ?? '管理员',
);
const greeting = computed<string>(() => {
  const h = new Date().getHours();
  if (h < 6) return '凌晨好';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  if (h < 22) return '晚上好';
  return '夜深了';
});
const today = computed<string>(() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
});
const lastLoginText = computed<string>(() => {
  const ts = userStore.lastLoginAt;
  if (!ts) return '首次登录';
  return new Date(ts).toLocaleString();
});

const gmvYuan = computed<string>(() => {
  if (!overview.value) return '—';
  const cents = Number(overview.value.gmv || 0);
  return (cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
});

const has = (p: string): boolean => userStore.has(p);

interface ShortCut {
  title: string;
  desc: string;
  icon: string;
  to: string;
  permission?: string;
  tone: 'brand' | 'success' | 'warning' | 'info' | 'danger';
}
const shortcuts: ShortCut[] = [
  {
    title: '外卖订单',
    desc: '订单全链路监控',
    icon: 'Bowl',
    to: '/admin/food-orders',
    permission: 'admin:menu:food-orders',
    tone: 'brand',
  },
  {
    title: '跑腿订单',
    desc: '4 类跑腿单监控',
    icon: 'Van',
    to: '/admin/errand-orders',
    permission: 'admin:menu:errand-orders',
    tone: 'info',
  },
  {
    title: '调度监控',
    desc: '人工派单/超时',
    icon: 'Compass',
    to: '/admin/dispatch',
    permission: 'admin:menu:dispatch',
    tone: 'warning',
  },
  {
    title: '售后仲裁',
    desc: '退款/责任判定',
    icon: 'Refresh',
    to: '/admin/after-sales',
    permission: 'admin:menu:after-sales',
    tone: 'danger',
  },
  {
    title: '商家审核',
    desc: '入驻资质核验',
    icon: 'Shop',
    to: '/admin/merchants/audit',
    permission: 'admin:merchants:view',
    tone: 'brand',
  },
  {
    title: '骑手审核',
    desc: '资质 + 健康证',
    icon: 'Avatar',
    to: '/admin/riders/audit',
    permission: 'admin:riders:view',
    tone: 'info',
  },
  {
    title: '数据大屏',
    desc: '实时运营指标',
    icon: 'DataAnalysis',
    to: '/admin/dashboard',
    permission: 'admin:menu:dashboard',
    tone: 'success',
  },
  {
    title: '报表导出',
    desc: '订单/财务报表',
    icon: 'Download',
    to: '/admin/exports',
    permission: 'admin:menu:exports',
    tone: 'brand',
  },
];
const visibleShortcuts = computed(() => shortcuts.filter((s) => !s.permission || has(s.permission)));

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  return p.catch(() => fallback);
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const tasks: Promise<unknown>[] = [];
    if (has('admin:menu:dashboard') || has('admin:settlements:view')) {
      tasks.push(
        safe(getDashboardOverview(), { code: '1', message: '', data: null, traceId: '', timestamp: 0 }).then((r) => {
          if (r.code === '0') overview.value = r.data;
        }),
      );
    }
    if (has('admin:menu:food-orders')) {
      tasks.push(
        safe(getTimelineStats(), { code: '1', message: '', data: null, traceId: '', timestamp: 0 }).then((r) => {
          if (r.code === '0') foodStats.value = r.data;
        }),
      );
    }
    if (has('admin:menu:errand-orders')) {
      tasks.push(
        safe(getErrandStats(), { code: '1', message: '', data: null, traceId: '', timestamp: 0 }).then((r) => {
          if (r.code === '0') errandStats.value = r.data;
        }),
      );
    }
    if (has('admin:merchants:view')) {
      tasks.push(
        safe(listApplications({ auditStatus: 'pending', pageNo: 1, pageSize: 1 }), {
          code: '1',
          message: '',
          data: null,
          traceId: '',
          timestamp: 0,
        }).then((r) => {
          merchantPendingCount.value = r.code === '0' && r.data ? r.data.total : 0;
        }),
      );
    }
    if (has('admin:riders:view')) {
      tasks.push(
        safe(listRiders({ auditStatus: 'pending', pageNo: 1, pageSize: 1 }), {
          code: '1',
          message: '',
          data: null,
          traceId: '',
          timestamp: 0,
        }).then((r) => {
          riderPendingCount.value = r.code === '0' && r.data ? r.data.total : 0;
        }),
      );
    }
    if (has('admin:menu:after-sales') || has('admin:after-sales:view')) {
      tasks.push(
        safe(listAfterSales({ status: 'PENDING_PLATFORM', pageNo: 1, pageSize: 1 }), {
          code: '1',
          message: '',
          data: null,
          traceId: '',
          timestamp: 0,
        }).then((r) => {
          afterSalePendingCount.value = r.code === '0' && r.data ? r.data.total : 0;
        }),
      );
    }
    if (has('admin:menu:withdrawals') || has('admin:withdrawals:view')) {
      tasks.push(
        safe(listWithdrawals({ status: 'PENDING', pageNo: 1, pageSize: 1 }), {
          code: '1',
          message: '',
          data: null,
          traceId: '',
          timestamp: 0,
        }).then((r) => {
          withdrawalPendingCount.value = r.code === '0' && r.data ? r.data.total : 0;
        }),
      );
    }
    if (has('admin:menu:risk') || has('admin:risk:view')) {
      tasks.push(
        safe(listRiskExceptions({ status: 'OPEN', pageNo: 1, pageSize: 6 }), {
          code: '1',
          message: '',
          data: null,
          traceId: '',
          timestamp: 0,
        }).then((r) => {
          exceptions.value = r.code === '0' && r.data ? r.data.items : [];
        }),
      );
    }
    await Promise.all(tasks);
  } finally {
    loading.value = false;
  }
}

function fmtAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return `${Math.floor(diff / 86_400_000)} 天前`;
}

onMounted(load);
</script>

<template>
  <PageContainer>
    <!-- Hero -->
    <section class="hero card-elevated">
      <div class="hero__bg">
        <div class="hero__orb" />
        <div class="hero__grid" />
      </div>
      <div class="hero__content">
        <div class="hero__left">
          <div class="hero__greet">{{ greeting }},{{ principalLabel }}</div>
          <div class="hero__date">{{ today }} · 上次登录 {{ lastLoginText }}</div>
        </div>
        <div class="hero__right">
          <el-button @click="load">
            <el-icon><Refresh /></el-icon>
            <span style="margin-left: 6px">刷新数据</span>
          </el-button>
        </div>
      </div>
    </section>

    <!-- KPI Row -->
    <section class="kpi-row">
      <StatCard
        label="今日 GMV"
        :value="gmvYuan"
        unit="元"
        tone="brand"
        :loading="loading && !overview"
        :hint="overview ? `订单 ${overview.orderCount}` : '后端 dashboard 实时聚合'"
      />
      <StatCard
        label="活跃用户"
        :value="overview?.activeUsers ?? '—'"
        tone="info"
        :loading="loading && !overview"
        hint="今日下单用户数"
      />
      <StatCard
        label="在线骑手"
        :value="overview?.onlineRiders ?? '—'"
        tone="success"
        :loading="loading && !overview"
        hint="rider_status.online"
      />
      <StatCard
        label="配送中订单"
        :value="foodStats?.deliveringCount ?? '—'"
        tone="info"
        :loading="loading && !foodStats"
        hint="外卖 DELIVERING"
      />
      <StatCard
        label="异常订单"
        :value="overview?.exceptionOrders ?? '—'"
        tone="danger"
        :loading="loading && !overview"
        hint="risk_exception_log OPEN"
      />
    </section>

    <!-- Todo + Exceptions -->
    <section class="row-2col">
      <div class="card-surface block">
        <header class="block__head">
          <h3 class="block__title">待处理事项</h3>
          <span class="block__sub">需要人工介入的工单</span>
        </header>
        <div class="todos">
          <button
            v-if="has('admin:merchants:view')"
            class="todo"
            :data-empty="!merchantPendingCount"
            @click="router.push('/admin/merchants/audit')"
          >
            <div class="todo__icon">
              <el-icon><Shop /></el-icon>
            </div>
            <div class="todo__body">
              <div class="todo__label">商家入驻待审核</div>
              <div class="todo__count stat-num">{{ merchantPendingCount }}</div>
            </div>
            <el-icon class="todo__arrow"><ArrowRight /></el-icon>
          </button>
          <button
            v-if="has('admin:riders:view')"
            class="todo"
            :data-empty="!riderPendingCount"
            @click="router.push('/admin/riders/audit')"
          >
            <div class="todo__icon">
              <el-icon><Avatar /></el-icon>
            </div>
            <div class="todo__body">
              <div class="todo__label">骑手入驻待审核</div>
              <div class="todo__count stat-num">{{ riderPendingCount }}</div>
            </div>
            <el-icon class="todo__arrow"><ArrowRight /></el-icon>
          </button>
          <button
            v-if="has('admin:menu:after-sales') || has('admin:after-sales:view')"
            class="todo"
            :data-empty="!afterSalePendingCount"
            @click="router.push('/admin/after-sales')"
          >
            <div class="todo__icon">
              <el-icon><Refresh /></el-icon>
            </div>
            <div class="todo__body">
              <div class="todo__label">售后待平台仲裁</div>
              <div class="todo__count stat-num">{{ afterSalePendingCount }}</div>
            </div>
            <el-icon class="todo__arrow"><ArrowRight /></el-icon>
          </button>
          <button
            v-if="has('admin:menu:withdrawals') || has('admin:withdrawals:view')"
            class="todo"
            :data-empty="!withdrawalPendingCount"
            @click="router.push('/admin/withdrawals')"
          >
            <div class="todo__icon">
              <el-icon><CreditCard /></el-icon>
            </div>
            <div class="todo__body">
              <div class="todo__label">提现单待处理</div>
              <div class="todo__count stat-num">{{ withdrawalPendingCount }}</div>
            </div>
            <el-icon class="todo__arrow"><ArrowRight /></el-icon>
          </button>
          <button
            v-if="has('admin:menu:food-orders')"
            class="todo"
            :data-empty="!foodStats?.merchantAcceptOverdueCount"
            @click="router.push('/admin/food-orders')"
          >
            <div class="todo__icon">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="todo__body">
              <div class="todo__label">商家 10min 未接单</div>
              <div class="todo__count stat-num">{{ foodStats?.merchantAcceptOverdueCount ?? 0 }}</div>
            </div>
            <el-icon class="todo__arrow"><ArrowRight /></el-icon>
          </button>
        </div>
      </div>

      <div class="card-surface block">
        <header class="block__head">
          <h3 class="block__title">最近异常订单</h3>
          <el-button v-if="has('admin:menu:risk')" link size="small" @click="router.push('/admin/exceptions')">
            全部 <el-icon><ArrowRight /></el-icon>
          </el-button>
        </header>
        <div v-if="exceptions.length === 0" class="block__body">
          <EmptyState title="暂无异常" description="OPEN 状态的异常订单将出现在这里" icon="CircleCheck" />
        </div>
        <ul v-else class="ex-list">
          <li v-for="ex in exceptions" :key="ex.logId" class="ex">
            <div class="ex__type">
              <StatusTag :status="ex.exceptionType" />
            </div>
            <div class="ex__main">
              <div class="ex__title">{{ ex.bizType }} · {{ ex.bizOrderId }}</div>
              <div class="ex__desc">{{ ex.description || '无描述' }}</div>
            </div>
            <div class="ex__time">{{ fmtAgo(ex.createdAt) }}</div>
          </li>
        </ul>
      </div>
    </section>

    <!-- Shortcuts -->
    <section v-if="visibleShortcuts.length" class="block card-surface">
      <header class="block__head">
        <h3 class="block__title">快捷入口</h3>
        <span class="block__sub">按权限显示</span>
      </header>
      <div class="shortcut-grid">
        <button
          v-for="s in visibleShortcuts"
          :key="s.to"
          class="shortcut"
          :data-tone="s.tone"
          @click="router.push(s.to)"
        >
          <div class="shortcut__icon">
            <el-icon><component :is="s.icon" /></el-icon>
          </div>
          <div class="shortcut__title">{{ s.title }}</div>
          <div class="shortcut__desc">{{ s.desc }}</div>
        </button>
      </div>
    </section>
  </PageContainer>
</template>

<style scoped>
/* Hero */
.hero {
  position: relative;
  overflow: hidden;
  padding: 28px 32px;
}
.hero__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.hero__orb {
  position: absolute;
  width: 380px;
  height: 380px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.18), transparent 65%);
  top: -120px;
  right: -80px;
  filter: blur(20px);
}
.hero__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: linear-gradient(180deg, black, transparent 90%);
}
.hero__content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hero__greet {
  font-size: 22px;
  font-weight: 600;
  color: var(--fg-primary);
  letter-spacing: 0.3px;
}
.hero__date {
  font-size: 13px;
  color: var(--fg-secondary);
  margin-top: 6px;
}

/* KPI */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--gap-4);
}

/* Row 2 col */
.row-2col {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
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
.block__body {
  padding: 8px 20px 20px;
}

/* Todos */
.todos {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.todo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition:
    background 0.15s,
    border-color 0.15s;
  color: inherit;
}
.todo:hover {
  background: var(--bg-elevated);
  border-color: var(--border-default);
}
.todo__icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.12);
  color: var(--brand-500);
  display: grid;
  place-items: center;
}
.todo__body {
  flex: 1;
  min-width: 0;
}
.todo__label {
  font-size: 13px;
  color: var(--fg-secondary);
}
.todo__count {
  font-size: 22px;
  font-weight: 600;
  color: var(--fg-primary);
  line-height: 1.2;
}
.todo[data-empty='true'] .todo__count {
  color: var(--fg-muted);
}
.todo__arrow {
  color: var(--fg-muted);
}

/* Exceptions list */
.ex-list {
  list-style: none;
  padding: 8px 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}
.ex {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-muted);
}
.ex:last-child {
  border-bottom: none;
}
.ex__main {
  flex: 1;
  min-width: 0;
}
.ex__title {
  font-size: 13px;
  color: var(--fg-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ex__desc {
  font-size: 12px;
  color: var(--fg-muted);
  margin-top: 2px;
}
.ex__time {
  font-size: 12px;
  color: var(--fg-muted);
  flex-shrink: 0;
}

/* Shortcuts */
.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  padding: 16px;
}
.shortcut {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 18px 16px;
  background: var(--bg-canvas);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.15s,
    transform 0.15s,
    background 0.15s;
  color: inherit;
}
.shortcut:hover {
  border-color: var(--brand-500);
  background: var(--bg-elevated);
  transform: translateY(-1px);
}
.shortcut__icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  margin-bottom: 6px;
  font-size: 16px;
}
.shortcut[data-tone='brand'] .shortcut__icon {
  background: rgba(59, 130, 246, 0.16);
  color: var(--brand-500);
}
.shortcut[data-tone='info'] .shortcut__icon {
  background: rgba(96, 165, 250, 0.16);
  color: var(--status-info);
}
.shortcut[data-tone='success'] .shortcut__icon {
  background: rgba(34, 197, 94, 0.16);
  color: var(--status-success);
}
.shortcut[data-tone='warning'] .shortcut__icon {
  background: rgba(245, 158, 11, 0.16);
  color: var(--status-warning);
}
.shortcut[data-tone='danger'] .shortcut__icon {
  background: rgba(239, 68, 68, 0.16);
  color: var(--status-danger);
}
.shortcut__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--fg-primary);
}
.shortcut__desc {
  font-size: 12px;
  color: var(--fg-muted);
}
</style>
