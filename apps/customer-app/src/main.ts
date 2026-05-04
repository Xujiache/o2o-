import { createPinia } from 'pinia';
import { createSSRApp } from 'vue';

import App from './App.vue';
import { useAuthStore } from './stores/auth';
import { setRefreshHandler } from './utils/request';

export function createApp() {
  const app = createSSRApp(App);
  const pinia = createPinia();
  app.use(pinia);
  // 注入 401 自动 refresh 处理器,避免 utils/request <-> stores/auth 循环依赖
  const auth = useAuthStore(pinia);
  setRefreshHandler(() => auth.refreshIfPossible());
  return { app };
}
