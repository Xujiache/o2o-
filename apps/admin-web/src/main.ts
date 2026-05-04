import { createPinia } from 'pinia';
import { createApp } from 'vue';

import 'element-plus/dist/index.css';
import 'virtual:uno.css';
import './styles/global.css';

import App from './App.vue';
import { permission } from './directives/permission';
import { router } from './router';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.directive('permission', permission);
app.mount('#app');
