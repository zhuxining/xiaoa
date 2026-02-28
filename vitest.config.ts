import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    projects: [
      // 单元测试项目
      {
        plugins: [react()],
        resolve: {
          alias: {
            "@": path.resolve(import.meta.dirname, "./src"),
          },
        },
        test: {
          name: "unit",
          dir: "./src/tests/unit",
          globals: true,
          environment: "jsdom",
          setupFiles: "./src/tests/unit/setup.ts",
          css: true,
          reporters: ["verbose"],
          coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            include: ["src/**/*"],
            exclude: [
              "src/tests/**",
              "src/**/*.d.ts",
              "src/main.ts",
              "src/preload.ts",
            ],
          },
        },
      },
      // 组件测试项目
      {
        plugins: [react()],
        resolve: {
          alias: {
            "@": path.resolve(import.meta.dirname, "./src"),
          },
        },
        test: {
          name: "component",
          dir: "./src/tests/components",
          globals: true,
          environment: "jsdom",
          setupFiles: "./src/tests/unit/setup.ts",
          css: true,
          reporters: ["verbose"],
          coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            include: ["src/components/**"],
            exclude: ["src/components/**/*.d.ts"],
          },
        },
      },
      // 集成测试项目
      {
        resolve: {
          alias: {
            "@": path.resolve(import.meta.dirname, "./src"),
          },
        },
        test: {
          name: "integration",
          dir: "./src/tests/integration",
          globals: true,
          environment: "node",
          setupFiles: "./src/tests/integration/setup.ts",
          testTimeout: 30_000,
          reporters: ["verbose"],
          coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            include: ["src/agent/**", "src/ipc/**"],
            exclude: ["src/**/*.d.ts"],
          },
        },
      },
    ],
  },
});
