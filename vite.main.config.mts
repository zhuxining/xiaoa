import path from "node:path";
import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      // 原生 Node.js 插件（.node 二进制）无法被 Vite 打包，需外部化
      external: ["koffi", /\.node$/],
    },
  },
});
