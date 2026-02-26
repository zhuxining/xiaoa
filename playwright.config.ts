import { defineConfig } from "@playwright/test";

/**
 * Playwright E2E 测试配置
 * 用于 Electron 应用测试
 */
export default defineConfig({
  testDir: "./src/tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  timeout: 30000,
  reporter: [
    ["html", { outputFolder: "test-results/html" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],

  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  outputDir: "test-results/artifacts",

  projects: [
    // Smoke Tests - 基础冒烟测试
    {
      name: "smoke",
      testMatch: /smoke.*\.test\.ts/,
      timeout: 60000,
    },
    // Session Tests - 会话相关测试
    {
      name: "session",
      testMatch: /session.*\.test\.ts/,
      dependencies: ["smoke"],
    },
    // Chat Tests - 对话相关测试
    {
      name: "chat",
      testMatch: /chat.*\.test\.ts/,
      dependencies: ["smoke"],
    },
    // Workspace Tests - 工作区相关测试
    {
      name: "workspace",
      testMatch: /workspace.*\.test\.ts/,
      dependencies: ["smoke"],
    },
    // Skill Tests - 技能相关测试
    {
      name: "skill",
      testMatch: /skill.*\.test\.ts/,
      dependencies: ["smoke"],
    },
    // Knowledge Tests - 知识库相关测试
    {
      name: "knowledge",
      testMatch: /knowledge.*\.test\.ts/,
      dependencies: ["smoke"],
    },
    // Integration Tests - 集成测试
    {
      name: "integration",
      testMatch: /integration.*\.test\.ts/,
      dependencies: ["session", "chat"],
    },
  ],
});
