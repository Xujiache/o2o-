<script setup lang="ts">
import { ref } from 'vue';

import { listSettlements } from '@/api/settlements';

const exporting = ref(false);

async function exportCSV(): Promise<void> {
  exporting.value = true;
  try {
    const r = await listSettlements({ pageNo: 1, pageSize: 100 });
    if (r.code !== '0' || !r.data) {
      uni.showToast({ title: '导出失败', icon: 'none' });
      return;
    }
    const header = [
      'settlementNo',
      'periodStart',
      'periodEnd',
      'gross',
      'commission',
      'fee',
      'net',
      'orderCount',
      'status',
    ];
    const rows = r.data.items.map((s) => [
      s.settlementNo,
      new Date(s.periodStart).toISOString(),
      new Date(s.periodEnd).toISOString(),
      (Number(s.grossCents) / 100).toFixed(2),
      (Number(s.commissionCents) / 100).toFixed(2),
      (Number(s.feeCents) / 100).toFixed(2),
      (Number(s.netCents) / 100).toFixed(2),
      String(s.orderCount),
      s.status,
    ]);
    const csv = [header, ...rows].map((r2) => r2.join(',')).join('\n');
    uni.setClipboardData({
      data: csv,
      success: () => uni.showToast({ title: 'CSV 已复制到剪贴板', icon: 'success' }),
    });
  } finally {
    exporting.value = false;
  }
}
</script>

<template>
  <view class="ex">
    <view class="ex__title">数据导出</view>
    <view class="ex__hint">本阶段仅支持移动端 CSV 导出(导出至剪贴板),平台 Web PDF 导出在 stage 9。</view>
    <button type="warn" :loading="exporting" @tap="exportCSV">导出最近 100 条结算单</button>
  </view>
</template>

<style scoped>
.ex {
  padding: 24rpx;
}
.ex__title {
  font-size: 32rpx;
  font-weight: 600;
  padding: 16rpx 0;
}
.ex__hint {
  color: #888;
  font-size: 22rpx;
  padding-bottom: 24rpx;
}
</style>
