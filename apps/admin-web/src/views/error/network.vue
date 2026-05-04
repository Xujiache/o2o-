<script setup lang="ts">
import { useRouter } from 'vue-router';
const router = useRouter();
</script>

<template>
  <el-result icon="error" title="网络错误" sub-title="无法连接到服务器">
    <template #extra>
      <el-button type="primary" @click="router.replace('/workbench')">重试</el-button>
    </template>
  </el-result>
</template>
