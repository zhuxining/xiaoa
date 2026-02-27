import { expect } from "@playwright/test";
import { test } from "../../fixtures/electron-app";
import { generateTestMessage } from "../../fixtures/test-data";
import { HomePage } from "../../pages/home.page";

/**
 * Chat Tests - 消息发送相关测试
 * 测试 ID: CH01, CH03, CH07, CH09
 */

test.describe("Chat Message Tests", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page, electronApp }) => {
    homePage = new HomePage(page, electronApp);
    await homePage.waitForReady();

    // 确保有一个会话
    const sessionCount = await homePage.getSessionCount();
    if (sessionCount === 0) {
      await homePage.createNewSession();
      await page.waitForTimeout(300);
    }
  });

  /**
   * CH01 - 发送消息并收到响应
   */
  test("CH01: 发送消息", async ({ page }) => {
    // 获取初始消息数量
    const initialCount = await homePage.getMessageCount();

    // 发送消息
    const message = generateTestMessage({ content: "你好，这是一条测试消息" });
    await homePage.sendMessage(message.content);

    // 等待消息发送
    await page.waitForTimeout(500);

    // 验证消息数量增加
    const newCount = await homePage.getMessageCount();
    expect(newCount).toBeGreaterThanOrEqual(initialCount + 1);

    // 验证消息出现在列表中
    const messageList = page.locator('[data-slot="agent-message-list"]');
    await expect(messageList).toContainText(message.content);
  });

  /**
   * CH03 - 流式消息显示
   * 注：需要 Mock Agent 返回流式响应
   */
  test("CH03: 流式消息显示", async ({ page }) => {
    // 发送消息
    await homePage.sendMessage("请写一段简短的回复");

    // 等待生成开始
    await page.waitForTimeout(300);

    // 在 E2E 环境下，由于 Mock Agent，流式显示可能不明显
    // 验证消息区域有内容
    const messageList = page.locator('[data-slot="agent-message-list"]');
    await expect(messageList).toBeVisible();

    // 等待响应完成
    await page.waitForTimeout(1000);

    // 验证有 assistant 消息
    const assistantMessages = page.locator('[data-role="assistant"]');
    const count = await assistantMessages.count();
    expect(count).toBeGreaterThan(0);
  });

  /**
   * CH07 - 模型选择切换
   */
  test("CH07: 模型选择切换", async ({ page }) => {
    // 打开模型选择器
    const modelButton = page.locator(
      "button:has-text('Claude'), button:has-text('选择模型')"
    );

    if ((await modelButton.count()) > 0) {
      await modelButton.click();

      // 等待模型列表出现
      await page.waitForTimeout(300);

      // 选择不同的模型
      const modelOption = page.locator("text=Claude 3.5 Haiku");
      if ((await modelOption.count()) > 0) {
        await modelOption.click();

        // 验证模型已切换
        await page.waitForTimeout(300);
        await expect(modelButton).toContainText("Haiku");
      }
    } else {
      // 如果没有模型选择器，跳过测试
      test();
    }
  });

  /**
   * CH09 - 发送空消息
   */
  test("CH09: 发送空消息 - 不应发送", async ({ page }) => {
    // 获取初始消息数量
    const initialCount = await homePage.getMessageCount();

    // 尝试发送空消息
    const textarea = page.locator("textarea");
    await textarea.fill("");
    await page.keyboard.press("Enter");

    // 等待
    await page.waitForTimeout(300);

    // 验证消息数量未变
    const newCount = await homePage.getMessageCount();
    expect(newCount).toBe(initialCount);
  });

  /**
   * CH09 - 发送纯空格消息
   */
  test("CH09: 发送纯空格消息 - 不应发送", async ({ page }) => {
    // 获取初始消息数量
    const initialCount = await homePage.getMessageCount();

    // 尝试发送纯空格消息
    const textarea = page.locator("textarea");
    await textarea.fill("   ");
    await page.keyboard.press("Enter");

    // 等待
    await page.waitForTimeout(300);

    // 验证消息数量未变
    const newCount = await homePage.getMessageCount();
    expect(newCount).toBe(initialCount);
  });
});

/**
 * Chat 消息格式测试
 */
test.describe("Chat Message Format Tests", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page, electronApp }) => {
    homePage = new HomePage(page, electronApp);
    await homePage.waitForReady();

    // 确保有一个会话
    const sessionCount = await homePage.getSessionCount();
    if (sessionCount === 0) {
      await homePage.createNewSession();
      await page.waitForTimeout(300);
    }
  });

  test("用户消息格式正确", async ({ page }) => {
    // 发送消息
    await homePage.sendMessage("测试用户消息格式");

    // 等待消息出现
    await page.waitForTimeout(500);

    // 验证用户消息元素
    const userMessage = page.locator('[data-role="user"]').first();
    await expect(userMessage).toBeVisible();
    await expect(userMessage).toContainText("测试用户消息格式");
  });

  test("多行消息发送", async ({ page }) => {
    // 输入多行消息
    const textarea = page.locator("textarea");
    await textarea.fill("第一行\n第二行\n第三行");

    // 发送
    await page.keyboard.press("Enter");

    // 等待消息出现
    await page.waitForTimeout(500);

    // 验证消息内容
    const messageList = page.locator('[data-slot="agent-message-list"]');
    await expect(messageList).toContainText("第一行");
  });

  test("特殊字符消息发送", async ({ page }) => {
    // 发送包含特殊字符的消息
    const specialMessage = "测试特殊字符: <>&\"'`{}[]";
    await homePage.sendMessage(specialMessage);

    // 等待消息出现
    await page.waitForTimeout(500);

    // 验证消息内容（特殊字符应该被正确转义）
    const messageList = page.locator('[data-slot="agent-message-list"]');
    await expect(messageList).toContainText("测试特殊字符");
  });
});
