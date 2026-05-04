<script setup lang="ts">
/** 系统参数页:阶段 0 无后端接口,放占位空态 */
</script>

<template>
  <el-card>
    <template #header>系统参数</template>
    <el-empty description="阶段 0 暂无后端接口,完整 sys_config 列表 + 编辑功能在阶段 4 / 9 实现" />
    <el-table disabled :data="[]" border stripe size="small" empty-text="无数据(占位)">
      <el-table-column prop="key" label="参数 Key" />
      <el-table-column prop="value" label="参数值" />
      <el-table-column prop="updatedAt" label="更新时间" width="180" />
      <el-table-column label="操作" width="120">
        <template #default>
          <el-button size="small" disabled>编辑</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>
