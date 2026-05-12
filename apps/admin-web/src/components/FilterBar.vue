<script setup lang="ts">
defineProps<{
  inline?: boolean;
}>();

defineEmits<{
  (e: 'search'): void;
  (e: 'reset'): void;
}>();
</script>

<template>
  <div class="filter-bar card-surface" :class="{ 'filter-bar--inline': inline }">
    <div class="filter-bar__fields">
      <slot />
    </div>
    <div class="filter-bar__actions">
      <slot name="actions">
        <el-button type="primary" @click="$emit('search')">查询</el-button>
        <el-button @click="$emit('reset')">重置</el-button>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  align-items: flex-start;
  gap: var(--gap-4);
  padding: var(--gap-4);
  flex-wrap: wrap;
}
.filter-bar__fields {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap-3);
  align-items: center;
}
.filter-bar__actions {
  display: flex;
  gap: var(--gap-2);
  flex-shrink: 0;
}
:deep(.filter-field) {
  display: inline-flex;
  align-items: center;
  gap: var(--gap-2);
}
:deep(.filter-field > label) {
  color: var(--fg-secondary);
  font-size: 13px;
  white-space: nowrap;
}
</style>
