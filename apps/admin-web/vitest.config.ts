import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import autoImport from 'unplugin-auto-import/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    vue(),
    autoImport({ resolvers: [ElementPlusResolver()] }),
    components({ resolvers: [ElementPlusResolver()] }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.spec.ts'],
    setupFiles: ['./src/test-setup.ts'],
    css: false,
    server: {
      deps: { inline: ['element-plus'] },
    },
  },
});
