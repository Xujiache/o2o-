<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

import { type AdminViolationItemVo, listViolations } from '@/api/admin-violations';

const list = ref<AdminViolationItemVo[]>([]);
const total = ref(0);
const loading = ref(false);

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '已上报', value: 'REPORTED' },
  { label: '平台仲裁中', value: 'PENDING_PLATFORM' },
  { label: '已确认', value: 'CONFIRMED' },
  { label: '已撤销', value: 'DROPPED' },
];

const TYPE_OPTIONS = [
  { label: '全部', value: '' },
  { label: '异常', value: 'EXCEPTION' },
  { label: '超时', value: 'LATE' },
  { label: '投诉', value: 'COMPLAINT' },
  { label: '欺诈', value: 'FRAUD' },
];

const STATUS_LABEL: Record<string, string> = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));

const query = reactive({ status: '', type: '', riderId: '', pageNo: 1, pageSize: 20 });

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await listViolations({
      status: query.status || undefined,
      type: query.type || undefined,
      riderId: query.riderId || undefined,
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
  void load();
}

function fmt(cents: string | null): string {
  return cents ? '¥' + (Number(cents) / 100).toFixed(2) : '-';
}

function fmtTime(ms: number | null): string {
  return ms ? new Date(ms).toLocaleString() : '-';
}

onMounted(load);
</script>

<template>
  <el-card>
    <template #header>
      <div class="header">
        <span>骑手违规记录</span>
        <el-form :model="query" :inline="true" size="small">
          <el-form-item label="状态">
            <el-select v-model="query.status" style="width: 140px">
              <el-option v-for="o in STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="query.type" style="width: 120px">
              <el-option v-for="o in TYPE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="骑手 ID">
            <el-input v-model="query.riderId" placeholder="riderId" style="width: 140px" />
          </el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
        </el-form>
      </div>
    </template>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="violationId" label="ID" width="80" />
      <el-table-column prop="riderId" label="骑手" width="100" />
      <el-table-column prop="type" label="类型" width="80" />
      <el-table-column prop="description" label="描述" />
      <el-table-column label="扣款" width="100">
        <template #default="{ row }">{{ fmt(row.deductCents) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">{{ STATUS_LABEL[row.status] || row.status }}</template>
      </el-table-column>
      <el-table-column label="上报时间" width="180">
        <template #default="{ row }">{{ fmtTime(row.reportedAt) }}</template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="query.pageNo"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="load"
        @size-change="load"
      />
    </div>
  </el-card>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
