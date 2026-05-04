<script setup lang="ts">
/** 角色权限页:阶段 0 无后端接口,放占位空态 */
</script>

<template>
  <div class="flex gap-4">
    <el-card class="flex-1">
      <template #header>角色列表</template>
      <el-empty description="阶段 0 占位" />
    </el-card>
    <el-card class="flex-1">
      <template #header>权限树</template>
      <el-tree :data="[]" empty-text="阶段 0 无后端接口,完整角色 / 权限管理在阶段 4 / 9 实现" />
    </el-card>
  </div>
</template>

<style scoped>
.flex {
  display: flex;
}
.flex-1 {
  flex: 1;
}
.gap-4 {
  gap: 16px;
}
</style>
