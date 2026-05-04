<script setup lang="ts">
import { useRouter } from 'vue-router';
const router = useRouter();
</script>

<template>
  <el-result icon="warning" title="403" sub-title="您没有此页面的访问权限">
    <template #extra>
      <el-button type="primary" @click="router.replace('/workbench')">返回工作台</el-button>
    </template>
  </el-result>
</template>
