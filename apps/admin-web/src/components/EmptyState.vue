<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
  icon?: string;
}>();
</script>

<template>
  <div class="empty-state">
    <div class="empty-state__icon">
      <el-icon><component :is="icon ?? 'Box'" /></el-icon>
    </div>
    <div class="empty-state__title">{{ title ?? '暂无数据' }}</div>
    <div v-if="description" class="empty-state__desc">{{ description }}</div>
    <div v-if="$slots.actions" class="empty-state__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  gap: 6px;
  color: var(--fg-muted);
  text-align: center;
}
.empty-state__icon {
  font-size: 36px;
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  background: var(--bg-elevated);
  border-radius: 50%;
  margin-bottom: 8px;
  color: var(--fg-muted);
}
.empty-state__title {
  color: var(--fg-secondary);
  font-size: 14px;
  font-weight: 500;
}
.empty-state__desc {
  color: var(--fg-muted);
  font-size: 12px;
}
.empty-state__actions {
  margin-top: 16px;
}
</style>
