import {
  test as base,
  type ElectronApplication,
  _electron as electron,
  type Page,
} from "@playwright/test";
import { findLatestBuild, parseElectronApp } from "electron-playwright-helpers";

/**
 * Electron App Fixture
 * 提供 Electron 应用启动和清理的 Playwright fixture
 */
export const test = base.extend<{
  electronApp: ElectronApplication;
  page: Page;
}>({
  electronApp: async ({}, use) => {
    // 查找最新构建
    const latestBuild = findLatestBuild();
    const appInfo = parseElectronApp(latestBuild);

    // 设置 E2E 测试环境标志
    process.env.CI = "e2e";

    // 启动 Electron 应用
    const electronApp = await electron.launch({
      args: [appInfo.main],
      env: { ...process.env, CI: "e2e" },
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
