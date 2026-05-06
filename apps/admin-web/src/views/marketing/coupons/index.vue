<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';

import { type CouponItemVo, type CreateCouponDto, listCoupons, publishCoupon } from '@/api/admin-marketing';

const loading = ref(false);
const list = ref<CouponItemVo[]>([]);
const total = ref(0);
const dialogVisible = ref(false);
const query = reactive({ status: '', bizType: '', pageNo: 1, pageSize: 20 });

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

async function load(): Promise<void> {
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

async function submit(): Promise<void> {
  const r = await publishCoupon(form);
  if (r.code === '0') {
    ElMessage.success('优惠券已发布');
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
        <span>优惠券管理</span>
        <el-button type="primary" @click="dialogVisible = true">发布优惠券</el-button>
      </div>
    </template>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="couponName" label="名称" />
      <el-table-column prop="couponType" label="类型" width="100" />
      <el-table-column prop="bizType" label="业务" width="100" />
      <el-table-column prop="threshold" label="门槛(分)" width="100" />
      <el-table-column prop="discount" label="减额/折扣" width="100" />
      <el-table-column prop="remainStock" label="剩余库存" width="100" />
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
        <el-form-item label="门槛(分)"><el-input v-model="form.threshold" /></el-form-item>
        <el-form-item label="减额(分)"><el-input v-model="form.discount" /></el-form-item>
        <el-form-item label="库存"><el-input-number v-model="form.totalStock" :min="1" /></el-form-item>
        <el-form-item label="开始(ms)"><el-input-number v-model="form.validFrom" /></el-form-item>
        <el-form-item label="结束(ms)"><el-input-number v-model="form.validTo" /></el-form-item>
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
