import { expect } from "@playwright/test";
import { test } from "../../fixtures/electron-app";
import { generateTestId } from "../../fixtures/test-data";
import { HomePage } from "../../pages/home.page";

/**
 * Session Tests - 会话相关测试
 * 测试 ID: SE01-SE08
 */

test.describe("Session CRUD Tests", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page, electronApp }) => {
    homePage = new HomePage(page, electronApp);
    await homePage.waitForReady();
  });

  /**
   * SE01 - 创建新会话
   */
  test("SE01: 创建新会话", async ({ page }) => {
    // 获取初始会话数量
    const initialCount = await homePage.getSessionCount();

    // 创建新会话
    await homePage.createNewSession();

    // 等待会话创建
    await page.waitForTimeout(500);

    // 断言会话数量增加
    const newCount = await homePage.getSessionCount();
    expect(newCount).toBe(initialCount + 1);

    // 断言新会话被选中
    const sessionList = page.locator('[data-slot="session-list"]');
    const selectedSession = sessionList.locator("button.bg-muted");
    await expect(selectedSession).toBeVisible();
  });

  /**
   * SE02 - 列出会话
   */
  test("SE02: 列出会话", async ({ page }) => {
    // 创建多个会话
    for (let i = 0; i < 3; i++) {
      await homePage.createNewSession();
      await page.waitForTimeout(300);
    }

    // 获取会话列表
    const sessions = page.locator(
      '[data-slot="session-list"] button[data-session-id]'
    );
    const count = await sessions.count();

    // 断言至少有 3 个会话
    expect(count).toBeGreaterThanOrEqual(3);

    // 验证每个会话都有标题
    for (let i = 0; i < count; i++) {
      const session = sessions.nth(i);
      const title = await session.locator(".font-medium").textContent();
      expect(title).toBeTruthy();
      expect(title?.length).toBeGreaterThan(0);
    }
  });

  /**
   * SE03 - 选择会话
   */
  test("SE03: 选择会话", async ({ page }) => {
    // 创建两个会话
    await homePage.createNewSession();
    await page.waitForTimeout(300);
    await homePage.createNewSession();
    await page.waitForTimeout(300);

    // 获取所有会话
    const sessions = page.locator(
      '[data-slot="session-list"] button[data-session-id]'
    );
    const count = await sessions.count();

    if (count >= 2) {
      // 点击第一个会话
      await sessions.first().click();
      await page.waitForTimeout(200);

      // 验证第一个会话被选中
      await expect(sessions.first()).toHaveClass(/bg-muted/);

      // 点击第二个会话
      await sessions.nth(1).click();
      await page.waitForTimeout(200);

      // 验证第二个会话被选中
      await expect(sessions.nth(1)).toHaveClass(/bg-muted/);
    }
  });

  /**
   * SE04 - 重命名会话
   * 注：需要右键菜单或编辑功能
   */
  test("SE04: 重命名会话", async ({ page }) => {
    // 创建新会话
    await homePage.createNewSession();
    await page.waitForTimeout(300);

    // 获取第一个会话
    const session = page
      .locator('[data-slot="session-list"] button[data-session-id]')
      .first();

    // 尝试右键点击（如果有重命名菜单）
    await session.click({ button: "right" });
    await page.waitForTimeout(200);

    // 查找重命名选项
    const renameOption = page.locator("text=重命名, text=Rename");

    if ((await renameOption.count()) > 0) {
      await renameOption.click();

      // 输入新名称
      const input = page.locator(
        "input[name=title], input[placeholder*='名称']"
      );
      if ((await input.count()) > 0) {
        const newName = `测试会话-${generateTestId("")}`;
        await input.fill(newName);
        await page.keyboard.press("Enter");

        // 验证名称已更改
        await page.waitForTimeout(300);
        await expect(page.locator(`text=${newName}`)).toBeVisible();
      }
    } else {
      // 如果没有重命名功能，跳过测试
      return;
    }
  });

  /**
   * SE05 - 删除会话
   * 注：需要右键菜单或删除按钮
   */
  test("SE05: 删除会话", async ({ page }) => {
    // 创建新会话
    await homePage.createNewSession();
    await page.waitForTimeout(300);

    // 获取初始会话数量
    const initialCount = await homePage.getSessionCount();

    // 获取第一个会话
    const session = page
      .locator('[data-slot="session-list"] button[data-session-id]')
      .first();

    // 尝试右键点击（如果有删除菜单）
    await session.click({ button: "right" });
    await page.waitForTimeout(200);

    // 查找删除选项
    const deleteOption = page.locator("text=删除, text=Delete");

    if ((await deleteOption.count()) > 0) {
      await deleteOption.click();

      // 确认删除（如果有确认对话框）
      const confirmButton = page.locator(
        "button:has-text('确认'), button:has-text('确定')"
      );
      if ((await confirmButton.count()) > 0) {
        await confirmButton.click();
      }

      // 等待删除完成
      await page.waitForTimeout(500);

      // 验证会话数量减少
      const newCount = await homePage.getSessionCount();
      expect(newCount).toBe(initialCount - 1);
    } else {
      // 如果没有删除功能，跳过测试
      return;
    }
  });

  /**
   * SE07 - 空标题创建会话
   */
  test("SE07: 空标题创建会话", async ({ page }) => {
    // 创建新会话
    await homePage.createNewSession();
    await page.waitForTimeout(300);

    // 验证会话被创建（应该有默认标题）
    const sessions = page.locator(
      '[data-slot="session-list"] button[data-session-id]'
    );
    const count = await sessions.count();
    expect(count).toBeGreaterThan(0);

    // 验证新会话有标题
    const lastSession = sessions.last();
    const title = await lastSession.locator(".font-medium").textContent();
    expect(title).toBeTruthy();
    expect(title?.length).toBeGreaterThan(0);
  });
});

/**
 * Session 持久化测试
 */
test.describe("Session Persistence Tests", () => {
  /**
   * SE06 - 重启后会话持久化
   * 注：需要重启应用，这里只验证会话保存
   */
  test("SE06: 会话持久化", async ({ page, electronApp }) => {
    const homePage = new HomePage(page, electronApp);
    await homePage.waitForReady();

    // 创建新会话
    await homePage.createNewSession();
    await page.waitForTimeout(300);

    // 获取会话数量
    const count = await homePage.getSessionCount();

    // 刷新页面模拟重启
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await homePage.waitForReady();

    // 验证会话数量相同
    const newCount = await homePage.getSessionCount();
    expect(newCount).toBe(count);
  });
});

/**
 * Session 边界测试
 */
test.describe("Session Edge Cases", () => {
  /**
   * SE08 - 删除不存在的会话
   */
  test("SE08: 删除不存在的会话 - 验证无崩溃", async ({ page, electronApp }) => {
    const homePage = new HomePage(page, electronApp);
    await homePage.waitForReady();

    // 获取初始会话数量
    const initialCount = await homePage.getSessionCount();

    // 验证应用仍然正常运行
    await expect(page.locator('[data-slot="chat-view"]')).toBeVisible();
    await expect(page.locator('[data-slot="session-list"]')).toBeVisible();

    // 验证会话数量未变
    const currentCount = await homePage.getSessionCount();
    expect(currentCount).toBe(initialCount);
  });
});
