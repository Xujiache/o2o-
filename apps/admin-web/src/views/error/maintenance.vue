<script setup lang="ts">
import { useRouter } from 'vue-router';
const router = useRouter();
</script>

<template>
  <el-result icon="info" title="系统维护中" sub-title="服务正在升级,稍后再试">
    <template #extra>
      <el-button type="primary" @click="router.replace('/workbench')">刷新</el-button>
    </template>
  </el-result>
</template>
