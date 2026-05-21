<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  label: string;
  value: string | number;
  hint?: string;
  trend?: { delta: number; positive?: boolean };
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  loading?: boolean;
  unit?: string;
}>();

const accent = computed<string>(() => `var(--accent-${props.tone ?? 'brand'})`);
</script>

<template>
  <div v-loading="loading" class="stat-card card-elevated" :data-tone="tone ?? 'brand'">
    <div class="stat-card__label">{{ label }}</div>
    <div class="stat-card__value">
      <span class="stat-num">{{ value }}</span>
      <span v-if="unit" class="stat-card__unit">{{ unit }}</span>
    </div>
    <div v-if="hint || trend" class="stat-card__foot">
      <span v-if="trend" class="stat-card__trend" :class="trend.positive ? 'up' : 'down'">
        {{ trend.positive ? '↑' : '↓' }} {{ Math.abs(trend.delta) }}%
      </span>
      <span v-if="hint" class="stat-card__hint">{{ hint }}</span>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  position: relative;
  padding: 18px 20px 16px;
  overflow: hidden;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease;
}
.stat-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, v-bind(accent) 0%, transparent 55%);
  opacity: 0.08;
  pointer-events: none;
}
.stat-card:hover {
  border-color: var(--border-strong);
  transform: translateY(-1px);
}
.stat-card__label {
  font-size: 12px;
  color: var(--fg-secondary);
  letter-spacing: 0.4px;
  text-transform: uppercase;
}
.stat-card__value {
  margin-top: 6px;
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 28px;
  font-weight: 600;
  color: var(--fg-primary);
}
.stat-card__unit {
  font-size: 13px;
  color: var(--fg-secondary);
  font-weight: 400;
}
.stat-card__foot {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}
.stat-card__trend.up {
  color: var(--status-success);
}
.stat-card__trend.down {
  color: var(--status-danger);
}
.stat-card__hint {
  color: var(--fg-muted);
}
.stat-card[data-tone='brand'] {
  --accent-brand: #2e9c5d;
}
.stat-card[data-tone='success'] {
  --accent-success: #22c55e;
}
.stat-card[data-tone='warning'] {
  --accent-warning: #f59e0b;
}
.stat-card[data-tone='danger'] {
  --accent-danger: #ef4444;
}
.stat-card[data-tone='info'] {
  --accent-info: #60a5fa;
}
.stat-card[data-tone='neutral'] {
  --accent-neutral: #5b6577;
}
</style>
