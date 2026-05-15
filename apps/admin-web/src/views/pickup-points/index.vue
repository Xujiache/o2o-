<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';

import {
  type CreatePickupPointReq,
  type PickupPointStatus,
  type PickupPointVo,
  createPickupPoint,
  listPickupPoints,
  softDeletePickupPoint,
  updatePickupPoint,
} from '@/api/admin-pickup-points';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const canManage = (): boolean => userStore.has('admin:pickup-point:write');

const loading = ref(false);
const list = ref<PickupPointVo[]>([]);
const total = ref(0);
const query = reactive<{ keyword: string; status: '' | PickupPointStatus; pageNo: number; pageSize: number }>({
  keyword: '',
  status: '',
  pageNo: 1,
  pageSize: 20,
});

const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const editingId = ref<string>('');
const form = reactive<CreatePickupPointReq>({
  name: '',
  address: '',
  cityCode: 'BJ',
  lng: 116.397428,
  lat: 39.90923,
  businessHourStart: '09:00',
  businessHourEnd: '21:00',
  contactPhone: '',
  status: 'active',
  notice: '',
});

const statusLabel: Record<PickupPointStatus, string> = {
  active: '营业',
  suspended: '临时停业',
  offline: '已下线',
};

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const r = await listPickupPoints({
      keyword: query.keyword || undefined,
      status: query.status === '' ? undefined : query.status,
      pageNo: query.pageNo,
      pageSize: query.pageSize,
    });
    if (r.code === '0' && r.data) {
      list.value = r.data.list;
      total.value = r.data.total;
    }
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  dialogMode.value = 'create';
  editingId.value = '';
  Object.assign(form, {
    name: '',
    address: '',
    cityCode: 'BJ',
    lng: 116.397428,
    lat: 39.90923,
    businessHourStart: '09:00',
    businessHourEnd: '21:00',
    contactPhone: '',
    status: 'active' as const,
    notice: '',
  });
  dialogVisible.value = true;
}

function openEdit(row: PickupPointVo): void {
  dialogMode.value = 'edit';
  editingId.value = row.pickupPointId;
  Object.assign(form, {
    name: row.name,
    address: row.address,
    cityCode: row.cityCode ?? '',
    lng: Number(row.lng),
    lat: Number(row.lat),
    businessHourStart: row.businessHourStart,
    businessHourEnd: row.businessHourEnd,
    contactPhone: row.contactPhone ?? '',
    status: row.status,
    notice: row.notice ?? '',
  });
  dialogVisible.value = true;
}

async function submit(): Promise<void> {
  if (!form.name.trim() || !form.address.trim()) {
    ElMessage.error('名称和地址必填');
    return;
  }
  if (Number.isNaN(Number(form.lng)) || Number.isNaN(Number(form.lat))) {
    ElMessage.error('经纬度必须为数字');
    return;
  }
  const payload: CreatePickupPointReq = {
    name: form.name.trim(),
    address: form.address.trim(),
    cityCode: form.cityCode?.trim() || undefined,
    lng: Number(form.lng),
    lat: Number(form.lat),
    businessHourStart: form.businessHourStart || undefined,
    businessHourEnd: form.businessHourEnd || undefined,
    contactPhone: form.contactPhone?.trim() || undefined,
    status: form.status,
    notice: form.notice?.trim() || undefined,
  };
  const r =
    dialogMode.value === 'create'
      ? await createPickupPoint(payload)
      : await updatePickupPoint(editingId.value, payload);
  if (r.code === '0') {
    ElMessage.success(dialogMode.value === 'create' ? '创建成功' : '更新成功');
    dialogVisible.value = false;
    void fetchList();
  } else {
    ElMessage.error(r.message ?? '操作失败');
  }
}

async function onDelete(row: PickupPointVo): Promise<void> {
  await ElMessageBox.confirm(`确定下线自提点「${row.name}」？(软删,可在历史中查看)`, '确认操作', {
    type: 'warning',
  });
  const r = await softDeletePickupPoint(row.pickupPointId);
  if (r.code === '0') {
    ElMessage.success('已下线');
    void fetchList();
  } else {
    ElMessage.error(r.message ?? '下线失败');
  }
}

onMounted(() => {
  void fetchList();
});
</script>

<template>
  <div class="page">
    <el-card>
      <div class="toolbar">
        <el-input v-model="query.keyword" placeholder="按名称/地址搜索" clearable style="width: 240px" />
        <el-select v-model="query.status" placeholder="状态" clearable style="width: 140px">
          <el-option label="营业" value="active" />
          <el-option label="临时停业" value="suspended" />
          <el-option label="已下线" value="offline" />
        </el-select>
        <el-button type="primary" @click="((query.pageNo = 1), fetchList())">搜索</el-button>
        <el-button v-if="canManage()" type="success" @click="openCreate">新增自提点</el-button>
      </div>

      <el-table v-loading="loading" :data="list" style="margin-top: 16px">
        <el-table-column prop="pickupPointId" label="ID" width="80" />
        <el-table-column prop="name" label="名称" min-width="160" />
        <el-table-column prop="address" label="地址" min-width="260" />
        <el-table-column prop="cityCode" label="城市" width="80" />
        <el-table-column label="经纬度" width="180">
          <template #default="{ row }">
            <span>{{ Number(row.lng).toFixed(4) }}, {{ Number(row.lat).toFixed(4) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="营业时间" width="150">
          <template #default="{ row }">
            <span>{{ row.businessHourStart }} - {{ row.businessHourEnd }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="contactPhone" label="电话" width="140" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : row.status === 'suspended' ? 'warning' : 'info'">
              {{ statusLabel[row.status as PickupPointStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :disabled="!canManage()" @click="openEdit(row)">编辑</el-button>
            <el-button
              size="small"
              type="danger"
              :disabled="!canManage() || row.status === 'offline'"
              @click="onDelete(row)"
              >下线</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="query.pageNo"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        background
        layout="total, sizes, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @current-change="fetchList"
        @size-change="fetchList"
      />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '新增自提点' : '编辑自提点'" width="640px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="例如:天安门自提点" />
        </el-form-item>
        <el-form-item label="详细地址" required>
          <el-input v-model="form.address" placeholder="北京市东城区..." />
        </el-form-item>
        <el-form-item label="城市编码">
          <el-input v-model="form.cityCode" placeholder="BJ" style="width: 160px" />
        </el-form-item>
        <el-form-item label="经度" required>
          <el-input-number v-model="form.lng" :precision="6" :step="0.001" style="width: 200px" />
        </el-form-item>
        <el-form-item label="纬度" required>
          <el-input-number v-model="form.lat" :precision="6" :step="0.001" style="width: 200px" />
        </el-form-item>
        <el-form-item label="营业开始">
          <el-input v-model="form.businessHourStart" placeholder="09:00" style="width: 140px" />
        </el-form-item>
        <el-form-item label="营业结束">
          <el-input v-model="form.businessHourEnd" placeholder="21:00" style="width: 140px" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.contactPhone" placeholder="可空" style="width: 220px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="active">营业</el-radio>
            <el-radio value="suspended">临时停业</el-radio>
            <el-radio value="offline">已下线</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="公告">
          <el-input v-model="form.notice" type="textarea" :rows="2" placeholder="如:春节休息至初七" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page {
  padding: 16px;
}
.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
}
</style>
