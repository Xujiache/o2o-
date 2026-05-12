<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';

import { type CouponItemVo, type CreateCouponDto, listCoupons, publishCoupon } from '@/api/admin-marketing';
import DataTable from '@/components/DataTable.vue';
import FilterBar from '@/components/FilterBar.vue';
import PageContainer from '@/components/PageContainer.vue';
import StatusTag from '@/components/StatusTag.vue';

const loading = ref(false);
const list = ref<CouponItemVo[]>([]);
const total = ref(0);
const dialogVisible = ref(false);
const query = reactive({ status: '', bizType: '', pageNo: 1, pageSize: 20 });

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '草稿', value: 'DRAFT' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '已下线', value: 'OFFLINE' },
];
const STATUS_LABEL: Record<string, string> = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));

const BIZ_OPTIONS = [
  { label: '全部', value: '' },
  { label: '外卖', value: 'FOOD' },
  { label: '跑腿', value: 'ERRAND' },
  { label: '通用', value: 'ALL' },
];
const BIZ_LABEL: Record<string, string> = Object.fromEntries(BIZ_OPTIONS.map((o) => [o.value, o.label]));

const TYPE_LABEL: Record<string, string> = { AMOUNT: '满减', DISCOUNT: '折扣' };

const form = reactive<CreateCouponDto>({
  couponName: '',
  couponType: 'AMOUNT',
  bizType: 'FOOD',
  threshold: '0',
  discount: '0',
  totalStock: 100,
  validFrom: Date.now(),
  validTo: Date.now() + 7 * 86400000,
});

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const r = await listCoupons({
      status: query.status || undefined,
      bizType: query.bizType || undefined,
      pageNo: query.pageNo,
      pageSize: query.pageSize,
    });
    if (r.code === '0' && r.data) {
      list.value = r.data.items;
      total.value = r.data.total;
    }
  } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  query.pageNo = 1;
  void fetchList();
}

function onReset(): void {
  query.status = '';
  query.bizType = '';
  query.pageNo = 1;
  void fetchList();
}

async function submit(): Promise<void> {
  const r = await publishCoupon(form);
  if (r.code === '0') {
    ElMessage.success('优惠券已发布');
    dialogVisible.value = false;
    await fetchList();
  } else {
    ElMessage.error(r.message);
  }
}

const fmtYuan = (cents: string | number): string => `${(Number(cents || 0) / 100).toFixed(2)} 元`;

onMounted(fetchList);
</script>

<template>
  <PageContainer title="优惠券管理" subtitle="满减 / 折扣券规则发布与库存">
    <template #extra>
      <el-button type="primary" @click="dialogVisible = true">发布优惠券</el-button>
      <el-button @click="fetchList">
        <el-icon><Refresh /></el-icon>
        <span style="margin-left: 6px">刷新</span>
      </el-button>
    </template>

    <FilterBar @search="onSearch" @reset="onReset">
      <div class="filter-field">
        <label>状态</label>
        <el-select v-model="query.status" placeholder="全部" clearable style="width: 140px">
          <el-option v-for="o in STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </div>
      <div class="filter-field">
        <label>业务</label>
        <el-select v-model="query.bizType" placeholder="全部" clearable style="width: 120px">
          <el-option v-for="o in BIZ_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </div>
    </FilterBar>

    <DataTable
      :data="list"
      :loading="loading"
      :total="total"
      v-model:pageNo="query.pageNo"
      v-model:pageSize="query.pageSize"
      @page-change="fetchList"
    >
      <el-table-column label="名称" prop="couponName" />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <span class="muted">{{ TYPE_LABEL[row.couponType] ?? row.couponType }}</span>
        </template>
      </el-table-column>
      <el-table-column label="业务" width="100">
        <template #default="{ row }">
          <span class="muted">{{ BIZ_LABEL[row.bizType] ?? row.bizType }}</span>
        </template>
      </el-table-column>
      <el-table-column label="门槛" width="110" align="right">
        <template #default="{ row }"
          ><span class="mono">{{ fmtYuan(row.threshold) }}</span></template
        >
      </el-table-column>
      <el-table-column label="减额/折扣" width="120" align="right">
        <template #default="{ row }">
          <span class="mono">{{ row.couponType === 'DISCOUNT' ? row.discount : `${fmtYuan(row.discount)}` }}</span>
        </template>
      </el-table-column>
      <el-table-column label="剩余库存" prop="remainStock" width="100" align="right">
        <template #default="{ row }"
          ><span class="mono">{{ row.remainStock }}</span></template
        >
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <StatusTag :status="row.status" :label="STATUS_LABEL[row.status] ?? row.status" />
        </template>
      </el-table-column>
    </DataTable>

    <el-dialog v-model="dialogVisible" title="发布优惠券" width="500px">
      <el-form :model="form" label-width="140px">
        <el-form-item label="名称"><el-input v-model="form.couponName" /></el-form-item>
        <el-form-item label="券类型">
          <el-select v-model="form.couponType">
            <el-option label="满减" value="AMOUNT" />
            <el-option label="折扣" value="DISCOUNT" />
          </el-select>
        </el-form-item>
        <el-form-item label="业务">
          <el-select v-model="form.bizType">
            <el-option label="外卖" value="FOOD" />
            <el-option label="跑腿" value="ERRAND" />
            <el-option label="全部" value="ALL" />
          </el-select>
        </el-form-item>
        <el-form-item label="门槛（元）"><el-input v-model="form.threshold" /></el-form-item>
        <el-form-item label="减额（元）"><el-input v-model="form.discount" /></el-form-item>
        <el-form-item label="库存"><el-input-number v-model="form.totalStock" :min="1" /></el-form-item>
        <el-form-item label="开始"><el-input-number v-model="form.validFrom" /></el-form-item>
        <el-form-item label="结束"><el-input-number v-model="form.validTo" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">提交</el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<style scoped>
.mono {
  font-family: var(--font-mono);
  font-size: 12px;
}
.muted {
  color: var(--fg-muted);
  font-size: 12px;
}
</style>
