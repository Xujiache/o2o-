<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  status: string;
  label?: string;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';
}>();

/** 业务状态 → tone 映射（自动推断，可被 props.tone 覆盖） */
const STATUS_TONE: Record<string, NonNullable<typeof props.tone>> = {
  // 通用
  active: 'success',
  enabled: 'success',
  approved: 'success',
  online: 'success',
  COMPLETED: 'success',
  DELIVERED: 'success',
  PAID: 'success',
  SUCCESS: 'success',

  pending: 'warning',
  WAIT_PAY: 'warning',
  PAID_WAIT_MERCHANT: 'warning',
  DISPATCHING: 'warning',
  PREPARING: 'warning',
  PENDING_MERCHANT: 'warning',
  PENDING_PLATFORM: 'warning',
  PROCESSING: 'warning',

  CANCELLED: 'danger',
  REFUNDED: 'danger',
  REFUNDING: 'danger',
  FAILED: 'danger',
  disabled: 'danger',
  rejected: 'danger',
  REJECTED: 'danger',
  offline: 'neutral',

  RIDER_ASSIGNED: 'info',
  ASSIGNED: 'info',
  PICKED_UP: 'info',
  DELIVERING: 'info',
  AFTER_SALE: 'info',
  READY_FOR_PICKUP: 'info',
  draft: 'neutral',
  scheduled: 'info',
};

const computedTone = computed<NonNullable<typeof props.tone>>(() => {
  if (props.tone) return props.tone;
  return STATUS_TONE[props.status] ?? 'neutral';
});
</script>

<template>
  <span class="status-tag" :data-tone="computedTone">
    <span class="status-tag__dot" />
    {{ label ?? status }}
  </span>
</template>

<style scoped>
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
  white-space: nowrap;
  border: 1px solid;
}
.status-tag__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.status-tag[data-tone='success'] {
  color: var(--status-success);
  background: var(--status-success-soft);
  border-color: rgba(34, 197, 94, 0.32);
}
.status-tag[data-tone='warning'] {
  color: var(--status-warning);
  background: var(--status-warning-soft);
  border-color: rgba(245, 158, 11, 0.32);
}
.status-tag[data-tone='danger'] {
  color: var(--status-danger);
  background: var(--status-danger-soft);
  border-color: rgba(239, 68, 68, 0.32);
}
.status-tag[data-tone='info'] {
  color: var(--status-info);
  background: var(--status-info-soft);
  border-color: rgba(96, 165, 250, 0.32);
}
.status-tag[data-tone='brand'] {
  color: var(--brand-500);
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.32);
}
.status-tag[data-tone='neutral'] {
  color: var(--fg-secondary);
  background: rgba(152, 163, 182, 0.1);
  border-color: var(--border-default);
}
</style>
