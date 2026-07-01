import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

const apiProxyTarget = 'http://123.57.81.179:8080';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [uni()],
  server: {
    proxy: {
      '/attendance': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      '/basic': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      '/device': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      '/schedule': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      '/visual': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
});
