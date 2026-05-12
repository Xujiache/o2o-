<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';

import { listRateRules, type PatchRateRuleDto, patchRateRule, type RateRuleItemVo } from '@/api/admin-rate-rules';

const loading = ref(false);
const list = ref<RateRuleItemVo[]>([]);
const total = ref(0);
const dialogVisible = ref(false);
const query = reactive({ cityCode: '', pageNo: 1, pageSize: 20 });

const form = reactive<PatchRateRuleDto>({
  cityCode: 'BJ',
  categoryId: null,
  merchantCommissionRate: 500,
  riderServiceFee: '300',
  withdrawFeeRate: 50,
  settlementCycle: 'T1',
  effectiveAt: Date.now(),
});

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await listRateRules({
      cityCode: query.cityCode || undefined,
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

async function submit(): Promise<void> {
  const r = await patchRateRule(form);
  if (r.code === '0') {
    ElMessage.success('费率配置已更新');
    dialogVisible.value = false;
    await load();
  } else {
    ElMessage.error(r.message);
  }
}

onMounted(load);
</script>

<template>
  <el-card>
    <template #header>
      <div class="header">
        <span>费率配置</span>
        <el-button type="primary" @click="dialogVisible = true">新增费率</el-button>
      </div>
    </template>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="rateRuleId" label="ID" width="80" />
      <el-table-column prop="cityCode" label="城市" width="100" />
      <el-table-column prop="categoryId" label="类目" width="100" />
      <el-table-column prop="merchantCommissionRate" label="商家佣金(万分)" width="140" />
      <el-table-column prop="riderServiceFee" label="骑手服务费（元）" width="140" />
      <el-table-column prop="withdrawFeeRate" label="提现手续费(万分)" width="160" />
      <el-table-column prop="settlementCycle" label="结算周期" width="120" />
      <el-table-column prop="status" label="状态" width="100" />
    </el-table>
    <el-pagination
      v-model:current-page="query.pageNo"
      v-model:page-size="query.pageSize"
      :total="total"
      style="margin-top: 16px"
      layout="total, prev, pager, next"
      @current-change="load"
    />

    <el-dialog v-model="dialogVisible" title="新增费率" width="500px">
      <el-form :model="form" label-width="140px">
        <el-form-item label="城市编码"><el-input v-model="form.cityCode" /></el-form-item>
        <el-form-item label="商家佣金(万分)">
          <el-input-number v-model="form.merchantCommissionRate" :min="0" />
        </el-form-item>
        <el-form-item label="骑手服务费（元）"><el-input v-model="form.riderServiceFee" /></el-form-item>
        <el-form-item label="提现手续费(万分)">
          <el-input-number v-model="form.withdrawFeeRate" :min="0" />
        </el-form-item>
        <el-form-item label="结算周期">
          <el-select v-model="form.settlementCycle">
            <el-option label="T+1" value="T1" />
            <el-option label="周结" value="WEEKLY" />
            <el-option label="月结" value="MONTHLY" />
          </el-select>
        </el-form-item>
        <el-form-item label="生效时间"><el-input-number v-model="form.effectiveAt" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">提交</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
