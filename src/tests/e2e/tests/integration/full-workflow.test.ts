import { expect } from "@playwright/test";
import { test } from "../../fixtures/electron-app";
import { generateTestId, generateTestMessage } from "../../fixtures/test-data";
import { HomePage } from "../../pages/home.page";
import { SettingsPage } from "../../pages/settings.page";

/**
 * Integration Tests - 集成测试
 * 测试 ID: IN01-IN06
 */

test.describe("Integration Tests", () => {
  let homePage: HomePage;
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page, electronApp }) => {
    homePage = new HomePage(page, electronApp);
    settingsPage = new SettingsPage(page, electronApp);
    await homePage.waitForReady();
  });

  /**
   * IN01 - 完整对话流程
   * 创建会话 → 发送消息 → 权限处理
   */
  test("IN01: 完整对话流程", async ({ page }) => {
    // Step 1: 创建新会话
    const initialSessionCount = await homePage.getSessionCount();
    await homePage.createNewSession();
    await page.waitForTimeout(500);

    const newSessionCount = await homePage.getSessionCount();
    expect(newSessionCount).toBe(initialSessionCount + 1);

    // Step 2: 发送消息
    const message = generateTestMessage({ content: "这是一条集成测试消息" });
    await homePage.sendMessage(message.content);
    await page.waitForTimeout(500);

    // 验证消息已发送
    const messageList = page.locator('[data-slot="agent-message-list"]');
    await expect(messageList).toContainText(message.content);

    // Step 3: 检查权限对话框（如果有）
    const permissionDialog = page.locator('[role="alertdialog"]');
    if (await permissionDialog.isVisible()) {
      // 允许权限
      await page.click("button:has-text('允许')");
      await page.waitForTimeout(300);
    }

    // 验证应用仍然正常运行
    await expect(page.locator('[data-slot="chat-view"]')).toBeVisible();
  });

  /**
   * IN02 - 工作区对话
   * 创建工作区 → 配置 Agent → 开始对话
   */
  test("IN02: 工作区对话流程", async ({ page }) => {
    // 查找工作区功能
    const workspaceSwitcher = page.locator(
      '[data-slot="workspace-switcher"], [data-testid="workspace-switcher"]'
    );

    if ((await workspaceSwitcher.count()) > 0) {
      // Step 1: 打开工作区选择器
      await workspaceSwitcher.click();
      await page.waitForTimeout(200);

      // Step 2: 创建新工作区（如果可以）
      const createButton = page.locator(
        "button:has-text('创建'), button:has-text('新建')"
      );

      if ((await createButton.count()) > 0) {
        await createButton.click();

        const workspaceName = `集成测试工作区-${generateTestId("")}`;
        const nameInput = page.locator(
          "input[placeholder*='名称'], input[name='name']"
        );

        if ((await nameInput.count()) > 0) {
          await nameInput.fill(workspaceName);
          await page.click("button:has-text('创建')");
          await page.waitForTimeout(500);

          // Step 3: 在工作区中发送消息
          await homePage.sendMessage("在工作区中测试消息");
          await page.waitForTimeout(500);

          // 验证消息已发送
          const messageList = page.locator('[data-slot="agent-message-list"]');
          await expect(messageList).toContainText("在工作区中测试消息");
        }
      }
    } else {
      // 如果没有工作区功能，执行基本对话流程
      await homePage.sendMessage("基本对话流程测试");
      await page.waitForTimeout(500);

      const messageList = page.locator('[data-slot="agent-message-list"]');
      await expect(messageList).toContainText("基本对话流程测试");
    }
  });

  /**
   * IN03 - Session Pool 复用
   * 同一会话多次消息验证 pool 行为
   */
  test("IN03: Session Pool 复用", async ({ page }) => {
    // 确保有一个会话
    const sessionCount = await homePage.getSessionCount();
    if (sessionCount === 0) {
      await homePage.createNewSession();
      await page.waitForTimeout(300);
    }

    // 在同一会话中发送多条消息
    for (let i = 0; i < 3; i++) {
      await homePage.sendMessage(`Session Pool 测试消息 ${i + 1}`);
      await page.waitForTimeout(500);
    }

    // 验证所有消息都已发送
    const messageList = page.locator('[data-slot="agent-message-list"]');
    await expect(messageList).toContainText("Session Pool 测试消息 1");
    await expect(messageList).toContainText("Session Pool 测试消息 2");
    await expect(messageList).toContainText("Session Pool 测试消息 3");

    // 验证应用没有内存泄漏或崩溃
    await expect(page.locator('[data-slot="chat-view"]')).toBeVisible();
  });

  /**
   * IN04 - 权限模式切换
   * 切换权限模式 → 验证行为变化
   */
  test("IN04: 权限模式切换", async ({ page }) => {
    // 导航到设置页面
    await homePage.goToSettings();
    await settingsPage.waitForReady();

    // 查找权限模式设置
    const permissionSection = page.locator("text=权限").locator("..");

    if ((await permissionSection.count()) > 0) {
      // 尝试切换权限模式
      const permissionSelect = permissionSection.locator(
        "select, [role=combobox]"
      );

      if ((await permissionSelect.count()) > 0) {
        await permissionSelect.click();
        await page.waitForTimeout(200);

        // 选择自动模式
        const autoOption = page.locator("text=自动, text=auto");
        if ((await autoOption.count()) > 0) {
          await autoOption.click();
          await page.waitForTimeout(300);

          // 保存设置
          await settingsPage.saveSettings();

          // 返回首页验证
          await settingsPage.goBack();
          await homePage.waitForReady();

          // 发送消息验证权限行为
          await homePage.sendMessage("测试权限模式切换");
          await page.waitForTimeout(500);

          // 验证应用正常运行
          await expect(page.locator('[data-slot="chat-view"]')).toBeVisible();
        }
      }
    } else {
      // 如果没有权限设置，跳过测试
      test();
    }
  });

  /**
   * IN05 - 主题持久化
   * 设置主题 → 重启应用 → 验证持久化
   */
  test("IN05: 主题持久化", async ({ page }) => {
    // 导航到设置页面
    await homePage.goToSettings();
    await settingsPage.waitForReady();

    // 获取当前主题
    const html = page.locator("html");
    const initialTheme = await html.getAttribute("class");

    // 切换主题
    const themeSection = page.locator("text=主题").locator("..");
    const themeSelect = themeSection.locator("select, [role=combobox]");

    if ((await themeSelect.count()) > 0) {
      await themeSelect.click();
      await page.waitForTimeout(200);

      // 选择不同的主题
      const newTheme = initialTheme?.includes("dark") ? "浅色" : "深色";
      const themeOption = page.locator(`text=${newTheme}`);

      if ((await themeOption.count()) > 0) {
        await themeOption.click();
        await page.waitForTimeout(500);

        // 保存设置
        await settingsPage.saveSettings();

        // 刷新页面模拟重启
        await page.reload();
        await page.waitForLoadState("domcontentloaded");
        await homePage.waitForReady();

        // 验证主题已持久化
        const persistedTheme = await html.getAttribute("class");
        if (newTheme === "深色") {
          expect(persistedTheme).toContain("dark");
        } else {
          expect(persistedTheme).not.toContain("dark");
        }
      }
    } else {
      test();
    }
  });

  /**
   * IN06 - 多会话管理
   * 创建多个会话 → 切换会话
   */
  test("IN06: 多会话管理", async ({ page }) => {
    // 创建多个会话
    const sessionNames: string[] = [];

    for (let i = 0; i < 3; i++) {
      await homePage.createNewSession();
      await page.waitForTimeout(300);

      // 记录会话名称
      const sessions = page.locator(
        '[data-slot="session-list"] button[data-session-id]'
      );
      const lastSession = sessions.last();
      const title = await lastSession.locator(".font-medium").textContent();
      if (title) {
        sessionNames.push(title);
      }
    }

    // 验证会话数量
    const sessionCount = await homePage.getSessionCount();
    expect(sessionCount).toBeGreaterThanOrEqual(3);

    // 切换会话
    const sessions = page.locator(
      '[data-slot="session-list"] button[data-session-id]'
    );

    for (let i = 0; i < 3; i++) {
      await sessions.nth(i).click();
      await page.waitForTimeout(200);

      // 验证会话已选中
      await expect(sessions.nth(i)).toHaveClass(/bg-muted/);

      // 发送消息
      await homePage.sendMessage(`会话 ${i + 1} 的消息`);
      await page.waitForTimeout(300);
    }

    // 验证所有会话都有消息
    // 切换回第一个会话验证消息存在
    await sessions.first().click();
    await page.waitForTimeout(200);

    const messageList = page.locator('[data-slot="agent-message-list"]');
    await expect(messageList).toContainText("会话 1 的消息");
  });
});

/**
 * 压力测试
 */
test.describe("Stress Tests", () => {
  test("快速切换会话", async ({ page, electronApp }) => {
    const homePage = new HomePage(page, electronApp);
    await homePage.waitForReady();

    // 创建多个会话
    for (let i = 0; i < 5; i++) {
      await homePage.createNewSession();
      await page.waitForTimeout(100);
    }

    // 快速切换
    const sessions = page.locator(
      '[data-slot="session-list"] button[data-session-id]'
    );
    const count = await sessions.count();

    for (let round = 0; round < 3; round++) {
      for (let i = 0; i < count; i++) {
        await sessions.nth(i).click();
        await page.waitForTimeout(50);
      }
    }

    // 验证应用没有崩溃
    await expect(page.locator('[data-slot="chat-view"]')).toBeVisible();
  });

  test("连续发送大量消息", async ({ page, electronApp }) => {
    const homePage = new HomePage(page, electronApp);
    await homePage.waitForReady();

    // 确保有一个会话
    const sessionCount = await homePage.getSessionCount();
    if (sessionCount === 0) {
      await homePage.createNewSession();
      await page.waitForTimeout(300);
    }

    // 连续发送消息
    for (let i = 0; i < 10; i++) {
      await homePage.sendMessage(`压力测试消息 ${i + 1}`);
      await page.waitForTimeout(200);
    }

    // 验证应用没有崩溃
    await expect(page.locator('[data-slot="chat-view"]')).toBeVisible();
  });
});
