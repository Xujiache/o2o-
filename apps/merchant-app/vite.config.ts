import uni from '@dcloudio/vite-plugin-uni';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [uni()],
    server: {
      host: '0.0.0.0',
      port: Number(env.VITE_DEV_PORT ?? 8084),
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
