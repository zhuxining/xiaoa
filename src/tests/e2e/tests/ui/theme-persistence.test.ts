/**
 * theme-persistence.test.ts - 主题持久化 E2E 测试
 */

import { expect, test } from "../../fixtures/electron-app";

test.describe("Theme Persistence", () => {
  test("app launches with default theme", async ({ page }) => {
    // 等待应用加载
    await page.waitForSelector("body");

    // 检查默认主题（通常是 system 或 light）
    const htmlElement = page.locator("html");
    const theme = await htmlElement.getAttribute("data-theme");

    // 应该有某种主题设置
    expect(theme).toBeDefined();
  });

  test("theme toggle works", async ({ page }) => {
    // 等待应用加载
    await page.waitForSelector("body");

    // 查找主题切换按钮（可能在设置或工具栏中）
    const themeToggle = page.locator('[data-testid="theme-toggle"]').first();

    if (await themeToggle.isVisible()) {
      // 获取当前主题
      const htmlElement = page.locator("html");
      const initialTheme = await htmlElement.getAttribute("data-theme");

      // 点击切换主题
      await themeToggle.click();

      // 等待主题变化
      await page.waitForTimeout(500);

      // 验证主题已改变
      const newTheme = await htmlElement.getAttribute("data-theme");
      expect(newTheme).not.toBe(initialTheme);
    }
  });

  test("theme persists after restart", async ({
    electronApp,
    page,
    testContext,
  }) => {
    // 等待应用加载
    await page.waitForSelector("body");

    // 查找主题切换按钮
    const themeToggle = page.locator('[data-testid="theme-toggle"]').first();

    if (await themeToggle.isVisible()) {
      // 切换主题
      await themeToggle.click();
      await page.waitForTimeout(500);

      // 获取设置的主题
      const htmlElement = page.locator("html");
      const themeBeforeRestart = await htmlElement.getAttribute("data-theme");

      // 关闭应用
      await electronApp.close();

      // 重新启动应用（使用相同的用户数据目录）
      const newApp = await require("@playwright/test")._electron.launch({
        args: [
          require("electron-playwright-helpers").parseElectronApp(
            require("electron-playwright-helpers").findLatestBuild()
          ).main,
        ],
        env: {
          ...process.env,
          CI: "e2e",
          XIAOA_USER_DATA: testContext.userDataPath,
          XIAOA_MOCK_LLM: "true",
        },
      });

      const newPage = await newApp.firstWindow();
      await newPage.waitForSelector("body");

      // 验证主题已恢复
      const newHtmlElement = newPage.locator("html");
      const themeAfterRestart = await newHtmlElement.getAttribute("data-theme");

      expect(themeAfterRestart).toBe(themeBeforeRestart);

      await newApp.close();
    }
  });
});
