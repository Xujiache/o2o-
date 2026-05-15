<script setup lang="ts">
/**
 * GR-5 溯源档案详情页(公开)
 */
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

import { type PublicTraceVo, publicLookupTrace } from '@/api/traceability';

const code = ref('');
const data = ref<PublicTraceVo | null>(null);
const loading = ref(true);
const errMsg = ref('');

function fmtDate(ms?: string | null): string {
  if (!ms) return '-';
  const d = new Date(Number(ms));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function load(): Promise<void> {
  loading.value = true;
  errMsg.value = '';
  try {
    const r = await publicLookupTrace(code.value);
    if (r.code === '0' && r.data) {
      data.value = r.data;
    } else {
      errMsg.value = r.message ?? '查询失败';
    }
  } catch {
    errMsg.value = '网络错误';
  } finally {
    loading.value = false;
  }
}

onLoad(async (q: Record<string, string | undefined>) => {
  code.value = q.code ?? '';
  await load();
});
</script>

<template>
  <view class="trace">
    <view v-if="loading" class="trace__empty">加载中...</view>
    <view v-else-if="errMsg" class="trace__empty trace__empty--err">{{ errMsg }}</view>
    <template v-else-if="data && data.archive">
      <view class="trace__hero">
        <text class="trace__hero-eyebrow">溯源档案</text>
        <text class="trace__hero-batch">批次 {{ data.archive.batchNo }}</text>
        <text v-if="data.archive.farmName" class="trace__hero-farm">{{ data.archive.farmName }}</text>
      </view>

      <view class="trace__card">
        <view class="trace__row"
          ><text class="trace__label">二维码</text
          ><text class="trace__val trace__val--mono">{{ data.code }}</text></view
        >
        <view class="trace__row"
          ><text class="trace__label">状态</text
          ><text class="trace__val">{{
            data.status === 'sold' ? '已售出' : data.status === 'bound' ? '在售/已绑' : data.status
          }}</text></view
        >
      </view>

      <view class="trace__card">
        <text class="trace__section">养殖信息</text>
        <view class="trace__row"
          ><text class="trace__label">养殖场</text
          ><text class="trace__val">{{ data.archive.farmName ?? '-' }}</text></view
        >
        <view class="trace__row"
          ><text class="trace__label">地址</text
          ><text class="trace__val">{{ data.archive.farmAddress ?? '-' }}</text></view
        >
        <view class="trace__row"
          ><text class="trace__label">出生日期</text
          ><text class="trace__val">{{ fmtDate(data.archive.breedDate) }}</text></view
        >
        <view class="trace__row"
          ><text class="trace__label">出栏日期</text
          ><text class="trace__val">{{ fmtDate(data.archive.slaughterDate) }}</text></view
        >
        <view class="trace__row"
          ><text class="trace__label">出栏重量</text
          ><text class="trace__val">{{ data.archive.weightGrams ? `${data.archive.weightGrams} g` : '-' }}</text></view
        >
        <view class="trace__row"
          ><text class="trace__label">饲养</text
          ><text class="trace__val">{{ data.archive.feedType ?? '-' }}</text></view
        >
      </view>

      <view class="trace__card">
        <text class="trace__section">检疫信息</text>
        <view class="trace__row"
          ><text class="trace__label">检疫证号</text
          ><text class="trace__val">{{ data.archive.quarantineCertNo ?? '-' }}</text></view
        >
        <view class="trace__row"
          ><text class="trace__label">检疫员</text
          ><text class="trace__val">{{ data.archive.veterinarian ?? '-' }}</text></view
        >
      </view>

      <view v-if="data.archive.vaccineRecords && data.archive.vaccineRecords.length > 0" class="trace__card">
        <text class="trace__section">疫苗记录</text>
        <view v-for="(v, idx) in data.archive.vaccineRecords" :key="idx" class="trace__row">
          <text class="trace__label">{{ v.name }}</text>
          <text class="trace__val">{{ v.date }}</text>
        </view>
      </view>

      <view v-if="data.archive.remark" class="trace__card">
        <text class="trace__section">备注</text>
        <text class="trace__val">{{ data.archive.remark }}</text>
      </view>
    </template>
    <view v-else class="trace__empty">未绑定档案的二维码或无效二维码</view>
  </view>
</template>

<style scoped>
.trace {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 60rpx;
}
.trace__empty {
  padding: 200rpx 0;
  text-align: center;
  color: #94a3b8;
  font-size: 28rpx;
}
.trace__empty--err {
  color: #ff4d4f;
}
.trace__hero {
  padding: 56rpx 32rpx;
  background: linear-gradient(135deg, #5fbe7d, #2e9c5d);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.trace__hero-eyebrow {
  font-size: 22rpx;
  opacity: 0.9;
}
.trace__hero-batch {
  font-size: 36rpx;
  font-weight: 800;
}
.trace__hero-farm {
  font-size: 26rpx;
  opacity: 0.95;
}
.trace__card {
  margin: 16rpx 24rpx;
  padding: 24rpx 28rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.05);
}
.trace__section {
  display: block;
  font-size: 24rpx;
  font-weight: 700;
  color: #2e9c5d;
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid rgba(23, 32, 51, 0.06);
  margin-bottom: 8rpx;
}
.trace__row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  align-items: baseline;
}
.trace__label {
  font-size: 24rpx;
  color: #94a3b8;
}
.trace__val {
  font-size: 26rpx;
  color: #172033;
  max-width: 60%;
  text-align: right;
}
.trace__val--mono {
  font-family: monospace;
  letter-spacing: 2rpx;
}
</style>
