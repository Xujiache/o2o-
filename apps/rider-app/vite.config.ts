import uni from '@dcloudio/vite-plugin-uni';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [uni()],
    server: {
      host: '0.0.0.0',
      port: Number(env.VITE_DEV_PORT ?? 8082),
    },
  };
});
