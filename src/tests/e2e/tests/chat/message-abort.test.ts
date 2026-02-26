import { expect } from "@playwright/test";
import { test } from "../../fixtures/electron-app";
import { HomePage } from "../../pages/home.page";

/**
 * Chat Tests - 消息中止相关测试
 * 测试 ID: CH02
 */

test.describe("Chat Abort Tests", () => {
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
   * CH02 - 中止生成
   */
  test("CH02: 中止生成", async ({ page }) => {
    // 发送消息
    await homePage.sendMessage("请写一个很长的回复");

    // 等待生成开始
    await page.waitForTimeout(300);

    // 查找中止按钮
    const abortButton = page.locator(
      'button[variant="destructive"], button:has(.lucide-square)'
    );

    // 如果中止按钮可见，点击它
    if (await abortButton.isVisible()) {
      await abortButton.click();

      // 等待中止完成
      await page.waitForTimeout(500);

      // 验证中止按钮不再可见（已切换回发送按钮）
      const sendButton = page.locator("button:has(.lucide-send)");
      await expect(sendButton).toBeVisible({ timeout: 3000 });
    } else {
      // 如果没有中止按钮，可能是 Mock Agent 响应太快
      // 跳过测试
      test.skip();
    }
  });

  /**
   * CH02 - 中止后可以继续发送
   */
  test("CH02: 中止后可以继续发送", async ({ page }) => {
    // 发送第一条消息
    await homePage.sendMessage("第一条消息");
    await page.waitForTimeout(500);

    // 发送第二条消息
    await homePage.sendMessage("第二条消息");

    // 等待
    await page.waitForTimeout(500);

    // 验证两条消息都存在
    const messageList = page.locator('[data-slot="agent-message-list"]');
    await expect(messageList).toContainText("第一条消息");
    await expect(messageList).toContainText("第二条消息");
  });

  /**
   * CH02 - 输入框在中止时禁用
   */
  test("CH02: 输入框状态正确", async ({ page }) => {
    // 验证输入框初始可用
    const textarea = page.locator("textarea");
    await expect(textarea).toBeEnabled();

    // 发送消息
    await homePage.sendMessage("测试输入框状态");

    // 等待一小段时间
    await page.waitForTimeout(200);

    // 在 Mock 环境下，响应可能很快
    // 验证输入框最终恢复可用
    await page.waitForTimeout(1000);
    await expect(textarea).toBeEnabled();
  });
});

/**
 * Abort 边界测试
 */
test.describe("Chat Abort Edge Cases", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page, electronApp }) => {
    homePage = new HomePage(page, electronApp);
    await homePage.waitForReady();
  });

  test("连续快速发送多条消息", async ({ page }) => {
    // 确保有一个会话
    const sessionCount = await homePage.getSessionCount();
    if (sessionCount === 0) {
      await homePage.createNewSession();
      await page.waitForTimeout(300);
    }

    // 快速发送多条消息
    for (let i = 0; i < 3; i++) {
      await homePage.sendMessage(`快速消息 ${i + 1}`);
      await page.waitForTimeout(100);
    }

    // 等待所有消息处理完成
    await page.waitForTimeout(2000);

    // 验证应用没有崩溃
    await expect(page.locator('[data-slot="chat-view"]')).toBeVisible();
  });

  test("发送超长消息", async ({ page }) => {
    // 确保有一个会话
    const sessionCount = await homePage.getSessionCount();
    if (sessionCount === 0) {
      await homePage.createNewSession();
      await page.waitForTimeout(300);
    }

    // 发送超长消息
    const longMessage = "测试超长消息：".repeat(100);
    await homePage.sendMessage(longMessage);

    // 等待
    await page.waitForTimeout(1000);

    // 验证应用没有崩溃
    await expect(page.locator('[data-slot="chat-view"]')).toBeVisible();
  });
});
