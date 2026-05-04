import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import unocss from 'unocss/vite';
import autoImport from 'unplugin-auto-import/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import components from 'unplugin-vue-components/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [
      vue(),
      unocss(),
      autoImport({ resolvers: [ElementPlusResolver()] }),
      components({ resolvers: [ElementPlusResolver()] }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    optimizeDeps: {
      // 强制 vite 预打包 @o2o/contracts(CJS dist)→ ESM,解决 named import 静态分析失败
      include: ['@o2o/contracts'],
    },
    build: {
      commonjsOptions: {
        // 允许 ESM/CJS 混合模块的命名导出穿透(packages/contracts 用 tsc CJS 输出)
        transformMixedEsModules: true,
      },
    },
    server: {
      host: '0.0.0.0',
      port: Number(env.VITE_DEV_PORT ?? 8083),
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
