<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRouter } from 'vue-router';

import { useUserStore } from '@/stores/user';
import { routes } from '@/router';

const router = useRouter();
const userStore = useUserStore();

interface MenuItem {
  path: string;
  title: string;
  icon: string;
  permission?: string;
}

const menus = computed<MenuItem[]>(() => {
  const layout = routes.find((r) => r.path === '/');
  const children = layout?.children ?? [];
  return children
    .filter((c) => c.meta?.menu)
    .filter((c) => {
      const p = c.meta?.permission as string | undefined;
      return !p || userStore.has(p);
    })
    .map((c) => ({
      path: '/' + c.path,
      title: (c.meta?.title as string) ?? c.path,
      icon: (c.meta?.icon as string) ?? 'Menu',
      permission: c.meta?.permission as string | undefined,
    }));
});

function logout(): void {
  userStore.logout();
  void router.replace('/login');
}
</script>

<template>
  <el-container class="h-full">
    <el-aside width="220px" class="bg-[#001529] text-white">
      <div class="px-4 py-4 text-lg font-semibold border-b border-white/10">O2O 平台管理</div>
      <el-menu
        :default-active="$route.path"
        background-color="#001529"
        text-color="#fff"
        active-text-color="#409eff"
        router
      >
        <el-menu-item v-for="m in menus" :key="m.path" :index="m.path">
          <span>{{ m.title }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="bg-white flex items-center justify-between px-4 border-b border-gray-200">
        <div>{{ $route.meta.title }}</div>
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-600">
            {{ userStore.principal?.principalId }} ({{ userStore.principal?.roles.join(',') }})
          </span>
          <el-button size="small" @click="logout">退出</el-button>
        </div>
      </el-header>
      <el-main>
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.h-full {
  height: 100vh;
}
</style>
