<script setup lang="ts">
defineProps<{
  title?: string;
  subtitle?: string;
  loading?: boolean;
}>();
</script>

<template>
  <section v-loading="loading" class="page-container">
    <header v-if="title || $slots.header || $slots.extra" class="page-header">
      <div class="page-header__title">
        <slot name="header">
          <h2 v-if="title" class="page-title">{{ title }}</h2>
          <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
        </slot>
      </div>
      <div v-if="$slots.extra" class="page-header__extra">
        <slot name="extra" />
      </div>
    </header>
    <slot name="filter" />
    <slot />
  </section>
</template>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: var(--gap-4);
}
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--gap-4);
}
.page-header__title {
  flex: 1;
  min-width: 0;
}
.page-header__extra {
  display: flex;
  align-items: center;
  gap: var(--gap-2);
}
</style>
