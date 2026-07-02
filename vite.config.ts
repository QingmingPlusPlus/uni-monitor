import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [uni()],
  server: {
    proxy: {
      '/api': {
        target: 'http://123.57.81.179:8080',
        changeOrigin: true,
        // 开发环境请求保留 /api 前缀进入 Vite 代理，再转发给后端时去掉。
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
