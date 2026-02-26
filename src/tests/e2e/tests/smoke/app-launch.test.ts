import { expect } from "@playwright/test";
import { test } from "../../fixtures/electron-app";
import { HomePage } from "../../pages/home.page";
import { SettingsPage } from "../../pages/settings.page";

/**
 * Smoke Tests - 基础冒烟测试
 * 测试 ID: S01-S05
 */

test.describe("Smoke Tests", () => {
  let homePage: HomePage;
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page, electronApp }) => {
    homePage = new HomePage(page, electronApp);
    settingsPage = new SettingsPage(page, electronApp);
  });

  /**
   * S01 - 应用启动并显示首页
   */
  test("S01: 应用启动并显示首页", async ({ page }) => {
    // 等待首页加载
    await homePage.waitForReady();

    // 断言页面已加载
    await homePage.assertPageLoaded();

    // 断言 Agent 名称正确
    await homePage.assertAgentName("小A");

    // 验证关键元素存在
    await expect(page.locator('[data-slot="chat-view"]')).toBeVisible();
    await expect(page.locator('[data-slot="session-list"]')).toBeVisible();
    await expect(page.locator('[data-slot="message-input"]')).toBeVisible();
  });

  /**
   * S02 - 导航到设置页面
   */
  test("S02: 导航到设置页面", async ({ page }) => {
    // 从首页导航到设置页面
    await homePage.waitForReady();
    await homePage.goToSettings();

    // 等待设置页面加载
    await settingsPage.waitForReady();

    // 断言设置页面已加载
    await settingsPage.assertPageLoaded();

    // 验证关键元素存在
    await expect(page.locator("text=设置")).toBeVisible();
    await expect(page.locator("text=配置应用程序")).toBeVisible();
    await expect(page.locator("button:has-text('保存')")).toBeVisible();
  });

  /**
   * S03 - 导航到工作区页面
   * 注：工作区页面需要通过侧边栏导航
   */
  test("S03: 导航到工作区页面", async ({ page }) => {
    await homePage.waitForReady();

    // 查找工作区切换器或导航
    const workspaceSwitcher = page.locator(
      '[data-slot="workspace-switcher"], [data-testid="workspace-switcher"]'
    );

    // 如果工作区切换器存在，点击它
    if (await workspaceSwitcher.count() > 0) {
      await workspaceSwitcher.click();

      // 等待工作区列表出现
      await expect(
        page.locator('[data-slot="workspace-list"], [role="menu"]')
      ).toBeVisible({ timeout: 5000 });
    } else {
      // 如果没有工作区切换器，跳过测试
      test.skip();
    }
  });

  /**
   * S04 - 主题切换
   */
  test("S04: 主题切换", async ({ page }) => {
    await homePage.waitForReady();

    // 导航到设置页面
    await homePage.goToSettings();
    await settingsPage.waitForReady();

    // 查找主题选择器
    const themeSection = page.locator("text=主题").locator("..");
    await expect(themeSection).toBeVisible();

    // 切换到深色主题
    const themeSelect = themeSection.locator("select, [role=combobox]");
    if (await themeSelect.count() > 0) {
      await themeSelect.click();
      await page.click("text=深色");

      // 等待主题应用
      await page.waitForTimeout(500);

      // 验证深色主题已应用（检查 class 或 data 属性）
      const html = page.locator("html");
      const isDark = await html.evaluate((el) => {
        return el.classList.contains("dark");
      });

      expect(isDark).toBe(true);
    } else {
      // 如果没有主题选择器，跳过测试
      test.skip();
    }
  });

  /**
   * S05 - 窗口控制（最小化/最大化）
   */
  test("S05: 窗口控制", async ({ electronApp, page }) => {
    await homePage.waitForReady();

    // 获取窗口
    const window = await electronApp.firstWindow();

    // 获取初始窗口大小
    const initialSize = await window.viewportSize();
    expect(initialSize).toBeDefined();

    // 查找窗口控制按钮
    const minimizeButton = page.locator(
      '[data-testid="minimize"], button:has(.lucide-minus)'
    );
    const maximizeButton = page.locator(
      '[data-testid="maximize"], button:has(.lucide-maximize)'
    );

    // 如果窗口控制按钮存在，测试最大化
    if (await maximizeButton.count() > 0) {
      await maximizeButton.click();
      await page.waitForTimeout(500);

      // 获取最大化后的窗口大小
      const maximizedSize = await window.viewportSize();
      expect(maximizedSize?.width).toBeGreaterThanOrEqual(
        initialSize?.width ?? 0
      );

      // 再次点击恢复
      await maximizeButton.click();
      await page.waitForTimeout(500);

      const restoredSize = await window.viewportSize();
      expect(restoredSize?.width).toBe(initialSize?.width);
    } else {
      // 如果没有窗口控制按钮，跳过测试
      test.skip();
    }
  });
});

/**
 * 额外的启动测试
 */
test.describe("应用启动测试", () => {
  test("应用窗口数量正确", async ({ electronApp }) => {
    const windows = electronApp.windows();
    expect(windows.length).toBeGreaterThanOrEqual(1);
  });

  test("应用无控制台错误", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // 等待页面加载
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // 过滤掉一些已知的非关键错误
    const criticalErrors = errors.filter(
      (err) =>
        !err.includes("Warning:") &&
        !err.includes("DevTools") &&
        !err.includes("Extension")
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test("应用无页面错误", async ({ page }) => {
    const pageErrors: Error[] = [];

    page.on("pageerror", (error) => {
      pageErrors.push(error);
    });

    // 等待页面加载
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    expect(pageErrors).toHaveLength(0);
  });
});
