import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  test as base,
  type ElectronApplication,
  _electron as electron,
  type Page,
} from "@playwright/test";
import { findLatestBuild, parseElectronApp } from "electron-playwright-helpers";

/**
 * 测试上下文类型
 */
interface TestContext {
  testId: string;
  userDataPath: string;
}

/**
 * Electron App Fixture
 * 提供 Electron 应用启动和清理的 Playwright fixture
 * - 每个测试使用独立的用户数据目录
 * - 支持 Mock LLM 模式
 */
export const test = base.extend<{
  electronApp: ElectronApplication;
  page: Page;
  testContext: TestContext;
}>({
  testContext: async ({}, use) => {
    const testId = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const userDataPath = mkdtempSync(join(tmpdir(), `xiaoa-${testId}-`));

    await use({ testId, userDataPath });

    // 清理测试数据
    rmSync(userDataPath, { recursive: true, force: true });
  },

  electronApp: async ({ testContext }, use) => {
    // 查找最新构建
    const latestBuild = findLatestBuild();
    const appInfo = parseElectronApp(latestBuild);

    // 启动 Electron 应用（带测试隔离）
    const electronApp = await electron.launch({
      args: [appInfo.main],
      env: {
        ...process.env,
        CI: "e2e",
        XIAOA_USER_DATA: testContext.userDataPath,
        XIAOA_MOCK_LLM: "true", // 启用 Mock LLM
      },
    });

    // 监听窗口事件
    electronApp.on("window", (page) => {
      const filename = page.url()?.split("/").pop();
      console.log(`[E2E] Window opened: ${filename}`);

      page.on("pageerror", (error) => {
        console.error("[E2E] Page error:", error);
      });

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          console.error("[E2E] Console error:", msg.text());
        }
      });
    });

    // 等待应用就绪
    await electronApp.firstWindow();

    await use(electronApp);

    // 清理
    await electronApp.close();
  },

  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");
    await use(page);
  },
});

export { expect } from "@playwright/test";
