<script setup lang="ts" generic="T extends Record<string, unknown>">
import { computed } from 'vue';

const props = defineProps<{
  data: T[];
  loading?: boolean;
  rowKey?: string;
  emptyText?: string;
  total?: number;
  pageNo?: number;
  pageSize?: number;
  pageSizes?: number[];
  height?: string | number;
}>();

const emit = defineEmits<{
  (e: 'update:pageNo', n: number): void;
  (e: 'update:pageSize', n: number): void;
  (e: 'page-change'): void;
}>();

const showPager = computed<boolean>(() => typeof props.total === 'number');
function onPageNo(v: number): void {
  emit('update:pageNo', v);
  emit('page-change');
}
function onPageSize(v: number): void {
  emit('update:pageSize', v);
  emit('page-change');
}
</script>

<template>
  <div class="data-table card-surface">
    <el-table
      v-loading="loading"
      :data="data"
      :row-key="rowKey"
      :empty-text="emptyText ?? '暂无数据'"
      :height="height"
      stripe
      style="width: 100%"
    >
      <slot />
    </el-table>
    <div v-if="showPager" class="data-table__footer">
      <el-pagination
        :current-page="pageNo ?? 1"
        :page-size="pageSize ?? 20"
        :total="total ?? 0"
        :page-sizes="pageSizes ?? [10, 20, 50, 100]"
        background
        layout="total, sizes, prev, pager, next, jumper"
        @update:current-page="onPageNo"
        @update:page-size="onPageSize"
      />
    </div>
  </div>
</template>

<style scoped>
.data-table {
  padding: 0;
  overflow: hidden;
}
.data-table__footer {
  display: flex;
  justify-content: flex-end;
  padding: var(--gap-3) var(--gap-4);
  border-top: 1px solid var(--border-default);
}
</style>
