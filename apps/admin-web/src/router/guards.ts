import type { Router } from 'vue-router';

import { useUserStore } from '@/stores/user';

export function setupGuards(router: Router): void {
  router.beforeEach((to) => {
    const userStore = useUserStore();
    const isPublic = !!to.meta.public;

    if (!isPublic && !userStore.isLoggedIn) {
      return { path: '/login', query: { redirect: to.fullPath } };
    }

    const required = to.meta.permission as string | undefined;
    if (required && !userStore.has(required)) {
      return { path: '/error/403' };
    }

    if (typeof to.meta.title === 'string') {
      document.title = `${to.meta.title} - O2O 平台管理`;
    }
    return true;
  });
}
