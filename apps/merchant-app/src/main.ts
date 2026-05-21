import { createPinia } from 'pinia';
import { createSSRApp } from 'vue';

import App from './App.vue';
import { useAuthStore } from './stores/auth';
import { setRefreshHandler } from './utils/request';
import './styles/theme.css';

export function createApp() {
  const app = createSSRApp(App);
  const pinia = createPinia();
  app.use(pinia);
  const auth = useAuthStore(pinia);
  setRefreshHandler(() => auth.refreshIfPossible());
  return { app };
}
