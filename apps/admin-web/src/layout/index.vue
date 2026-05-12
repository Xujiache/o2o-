<script setup lang="ts">
import { ArrowDown, Expand, Fold } from '@element-plus/icons-vue';
import { computed, ref } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';

import { useUserStore } from '@/stores/user';

import { MENU_GROUPS, type MenuChild, type MenuGroup } from './menu-config';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const collapsed = ref<boolean>(false);

interface FilteredGroup extends MenuGroup {
  children: MenuChild[];
}

const groups = computed<FilteredGroup[]>(() =>
  MENU_GROUPS.map((g) => ({
    ...g,
    children: g.children.filter((c) => !c.permission || userStore.has(c.permission)),
  })).filter((g) => g.children.length > 0),
);

const flatRoutes = computed<MenuChild[]>(() => groups.value.flatMap((g) => g.children));

const breadcrumbs = computed<Array<{ title: string; path?: string }>>(() => {
  const out: Array<{ title: string; path?: string }> = [];
  const current = flatRoutes.value.find((c) => c.path === route.path);
  const group = MENU_GROUPS.find((g) => g.children.some((c) => c.path === route.path));
  if (group) out.push({ title: group.title });
  if (current) {
    out.push({ title: current.title });
  } else if (route.meta?.title) {
    out.push({ title: route.meta.title as string });
  }
  if (out.length === 0) out.push({ title: '工作台' });
  return out;
});

const principalLabel = computed<string>(
  () =>
    (userStore.principal?.displayName ?? userStore.principal?.username ?? userStore.principal?.principalId) || '管理员',
);
const rolesLabel = computed<string>(() => (userStore.principal?.roles ?? []).join(' · ') || '—');
const lastLoginText = computed<string>(() => {
  const ts = userStore.lastLoginAt;
  if (!ts) return '';
  return new Date(ts).toLocaleString();
});

function onCommand(cmd: string): void {
  if (cmd === 'logout') {
    userStore.logout();
    void router.replace('/login');
  }
}

function firstChild(group: FilteredGroup): MenuChild {
  return group.children[0]!;
}
</script>

<template>
  <el-container class="layout">
    <el-aside :width="collapsed ? '64px' : '232px'" class="layout__aside">
      <div class="brand" :class="{ 'brand--collapsed': collapsed }">
        <div class="brand__logo">
          <el-icon><Promotion /></el-icon>
        </div>
        <div v-show="!collapsed" class="brand__text">
          <div class="brand__name">O2O Platform</div>
          <div class="brand__tag">Admin Console</div>
        </div>
      </div>

      <div class="nav">
        <el-menu
          :default-active="route.path"
          :collapse="collapsed"
          :collapse-transition="false"
          background-color="transparent"
          unique-opened
          router
        >
          <template v-for="g in groups" :key="g.key">
            <el-sub-menu v-if="g.children.length > 1" :index="g.key">
              <template #title>
                <el-icon><component :is="g.icon" /></el-icon>
                <span>{{ g.title }}</span>
              </template>
              <el-menu-item v-for="c in g.children" :key="c.path" :index="c.path">
                <el-icon><component :is="c.icon ?? 'Minus'" /></el-icon>
                <template #title>{{ c.title }}</template>
              </el-menu-item>
            </el-sub-menu>
            <el-menu-item v-else :index="firstChild(g).path">
              <el-icon><component :is="firstChild(g).icon ?? g.icon" /></el-icon>
              <template #title>{{ firstChild(g).title }}</template>
            </el-menu-item>
          </template>
        </el-menu>
      </div>
    </el-aside>

    <el-container class="layout__main">
      <el-header class="layout__header">
        <div class="layout__header-left">
          <el-button text size="small" class="collapse-toggle" @click="collapsed = !collapsed">
            <el-icon :size="18"><component :is="collapsed ? Expand : Fold" /></el-icon>
          </el-button>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item v-for="(b, i) in breadcrumbs" :key="i">
              {{ b.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="layout__header-right">
          <el-dropdown trigger="click" placement="bottom-end" @command="onCommand">
            <div class="user-pill">
              <div class="user-pill__avatar">
                <el-icon><UserFilled /></el-icon>
              </div>
              <div class="user-pill__meta">
                <div class="user-pill__name">{{ principalLabel }}</div>
                <div class="user-pill__role">{{ rolesLabel }}</div>
              </div>
              <el-icon class="user-pill__caret"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  <div class="dd-meta">
                    <div class="dd-meta__name">{{ principalLabel }}</div>
                    <div v-if="lastLoginText" class="dd-meta__last">上次登录 {{ lastLoginText }}</div>
                  </div>
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="layout__content">
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout {
  height: 100vh;
  background: var(--bg-canvas);
}
.layout__aside {
  background: var(--bg-sunken);
  border-right: 1px solid var(--border-default);
  transition: width 0.22s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 16px;
  border-bottom: 1px solid var(--border-default);
}
.brand--collapsed {
  justify-content: center;
  padding: 18px 0;
}
.brand__logo {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--brand-500), #6366f1);
  display: grid;
  place-items: center;
  color: white;
  font-size: 18px;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.06),
    0 6px 20px -6px rgba(59, 130, 246, 0.5);
}
.brand__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--fg-primary);
  letter-spacing: 0.5px;
}
.brand__tag {
  font-size: 11px;
  color: var(--fg-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}
.nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.layout__main {
  background: var(--bg-canvas);
  min-width: 0;
}
.layout__header {
  background: var(--bg-canvas);
  border-bottom: 1px solid var(--border-default);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
}
.layout__header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.collapse-toggle {
  color: var(--fg-secondary);
}
.collapse-toggle:hover {
  color: var(--brand-500);
}
.layout__header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 10px 4px 4px;
  border-radius: 999px;
  border: 1px solid var(--border-default);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}
.user-pill:hover {
  border-color: var(--border-strong);
  background: var(--bg-elevated);
}
.user-pill__avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-elevated);
  display: grid;
  place-items: center;
  color: var(--brand-500);
}
.user-pill__meta {
  line-height: 1.15;
  text-align: left;
}
.user-pill__name {
  font-size: 13px;
  color: var(--fg-primary);
  font-weight: 500;
}
.user-pill__role {
  font-size: 11px;
  color: var(--fg-muted);
}
.user-pill__caret {
  color: var(--fg-muted);
  font-size: 12px;
}

.dd-meta__name {
  font-weight: 500;
  color: var(--fg-primary);
}
.dd-meta__last {
  font-size: 11px;
  color: var(--fg-muted);
  margin-top: 2px;
}

.layout__content {
  padding: 24px;
  overflow: auto;
}

:deep(.el-menu) {
  border-right: none;
}
:deep(.el-sub-menu__title),
:deep(.el-menu-item) {
  color: var(--fg-secondary);
  font-size: 13px;
}
:deep(.el-sub-menu__title:hover),
:deep(.el-menu-item:hover) {
  background: var(--bg-elevated) !important;
  color: var(--fg-primary) !important;
}
:deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.16), transparent);
  color: var(--brand-500) !important;
  font-weight: 500;
  border-left: 2px solid var(--brand-500);
  padding-left: calc(20px - 2px) !important;
}
:deep(.el-menu--collapse .el-menu-item.is-active),
:deep(.el-menu--collapse .el-sub-menu__title) {
  padding-left: 20px !important;
  border-left: none;
}
:deep(.el-sub-menu .el-menu-item) {
  padding-left: 48px !important;
}
:deep(.el-sub-menu.is-active .el-sub-menu__title) {
  color: var(--fg-primary);
}
</style>
