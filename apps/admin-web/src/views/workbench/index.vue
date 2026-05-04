<script setup lang="ts">
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
</script>

<template>
  <div>
    <el-card>
      <template #header>欢迎使用 O2O 平台管理</template>
      <p>当前账号: {{ userStore.principal?.principalId }} ({{ userStore.principal?.roles.join(',') }})</p>
      <p>权限点数: {{ userStore.permissions.length }}</p>
      <p>阶段 0 工作台为空框架,业务模块在 stage 4 / 9 接入。</p>
    </el-card>
  </div>
</template>
