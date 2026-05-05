<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';

import {
  type CityItemVo,
  type CreateCityReq,
  type GeoJsonPolygon,
  createCity,
  disableCity,
  listCities,
  updateCity,
} from '@/api/admin-cities';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const canManage = (): boolean => userStore.has('admin:cities:manage');

const loading = ref(false);
const list = ref<CityItemVo[]>([]);
const total = ref(0);
const query = reactive<{ keyword: string; serviceEnabled: '' | 'true' | 'false'; pageNo: number; pageSize: number }>({
  keyword: '',
  serviceEnabled: '',
  pageNo: 1,
  pageSize: 20,
});

const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const form = reactive<{
  cityCode: string;
  cityName: string;
  province: string;
  serviceEnabled: boolean;
  serviceAreaText: string;
  displayOrder: number;
}>({
  cityCode: '',
  cityName: '',
  province: '',
  serviceEnabled: true,
  serviceAreaText: '',
  displayOrder: 0,
});

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const r = await listCities({
      keyword: query.keyword || undefined,
      serviceEnabled: query.serviceEnabled === '' ? undefined : query.serviceEnabled === 'true',
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
  form.cityCode = '';
  form.cityName = '';
  form.province = '';
  form.serviceEnabled = true;
  form.serviceAreaText = '';
  form.displayOrder = 0;
  dialogVisible.value = true;
}

function openEdit(row: CityItemVo): void {
  dialogMode.value = 'edit';
  form.cityCode = row.cityCode;
  form.cityName = row.cityName;
  form.province = row.province ?? '';
  form.serviceEnabled = row.serviceEnabled;
  form.serviceAreaText = row.serviceArea ? JSON.stringify(row.serviceArea, null, 2) : '';
  form.displayOrder = row.displayOrder;
  dialogVisible.value = true;
}

function parseServiceArea(text: string): GeoJsonPolygon | null | 'invalid' {
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as GeoJsonPolygon;
  } catch {
    return 'invalid';
  }
}

async function submit(): Promise<void> {
  const sa = parseServiceArea(form.serviceAreaText);
  if (sa === 'invalid') {
    ElMessage.error('serviceArea 不是合法 JSON');
    return;
  }
  if (dialogMode.value === 'create') {
    const body: CreateCityReq = {
      cityCode: form.cityCode.trim(),
      cityName: form.cityName.trim(),
      province: form.province || undefined,
      serviceEnabled: form.serviceEnabled,
      serviceArea: sa,
      displayOrder: form.displayOrder,
    };
    const r = await createCity(body);
    if (r.code === '0') {
      ElMessage.success('已新增');
      dialogVisible.value = false;
      void fetchList();
    }
  } else {
    const r = await updateCity(form.cityCode, {
      cityName: form.cityName,
      province: form.province || undefined,
      serviceEnabled: form.serviceEnabled,
      serviceArea: sa,
      displayOrder: form.displayOrder,
    });
    if (r.code === '0') {
      ElMessage.success('已保存');
      dialogVisible.value = false;
      void fetchList();
    }
  }
}

async function onDisable(row: CityItemVo): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认禁用 ${row.cityName}(${row.cityCode})?`, '禁用确认', { type: 'warning' });
    const r = await disableCity(row.cityCode);
    if (r.code === '0') {
      ElMessage.success('已禁用');
      void fetchList();
    }
  } catch {
    /* user cancel */
  }
}

onMounted(fetchList);
</script>

<template>
  <div class="cities">
    <el-card>
      <template #header>
        <div class="header">
          <span>城市站点管理</span>
          <el-button v-if="canManage()" type="primary" size="small" @click="openCreate">+ 新增城市</el-button>
        </div>
      </template>

      <el-form :model="query" :inline="true">
        <el-form-item label="关键字">
          <el-input
            v-model="query.keyword"
            placeholder="cityCode / cityName"
            clearable
            @keyup.enter="
              () => {
                query.pageNo = 1;
                void fetchList();
              }
            "
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.serviceEnabled" placeholder="全部" clearable style="width: 140px">
            <el-option label="启用" value="true" />
            <el-option label="禁用" value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            @click="
              () => {
                query.pageNo = 1;
                void fetchList();
              }
            "
            >查询</el-button
          >
        </el-form-item>
      </el-form>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="cityCode" prop="cityCode" width="100" />
        <el-table-column label="cityName" prop="cityName" width="140" />
        <el-table-column label="province" prop="province" width="140" />
        <el-table-column label="启用" width="80">
          <template #default="{ row }">
            <el-tag :type="row.serviceEnabled ? 'success' : 'info'">{{ row.serviceEnabled ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="serviceArea">
          <template #default="{ row }">
            <code v-if="row.serviceArea" class="ga">{{ JSON.stringify(row.serviceArea).slice(0, 50) }}...</code>
            <span v-else class="muted">全城</span>
          </template>
        </el-table-column>
        <el-table-column label="displayOrder" prop="displayOrder" width="120" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canManage()" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-if="canManage() && row.serviceEnabled" link type="danger" @click="onDisable(row)">
              禁用
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="total"
          :current-page="query.pageNo"
          :page-size="query.pageSize"
          @current-change="
            (p: number) => {
              query.pageNo = p;
              void fetchList();
            }
          "
        />
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增城市' : `编辑 ${form.cityCode}`"
      width="640px"
    >
      <el-form label-width="100px" label-position="right">
        <el-form-item label="cityCode">
          <el-input v-model="form.cityCode" :disabled="dialogMode === 'edit'" placeholder="如 BJ / SH" />
        </el-form-item>
        <el-form-item label="cityName">
          <el-input v-model="form.cityName" />
        </el-form-item>
        <el-form-item label="province">
          <el-input v-model="form.province" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.serviceEnabled" />
        </el-form-item>
        <el-form-item label="displayOrder">
          <el-input-number v-model="form.displayOrder" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="serviceArea">
          <el-input
            v-model="form.serviceAreaText"
            type="textarea"
            :rows="6"
            placeholder='留空 = 全城开放;否则填 GeoJSON Polygon,如 {"type":"Polygon","coordinates":[[[116,39],[117,39],[117,40],[116,40],[116,39]]]}'
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.cities {
  padding: 16px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.muted {
  color: #999;
}
.ga {
  font-family: monospace;
  font-size: 12px;
}
.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
