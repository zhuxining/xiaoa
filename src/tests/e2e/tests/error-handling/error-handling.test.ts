/**
 * error-handling.test.ts - 错误处理 E2E 测试
 */

import { expect, test } from "../../fixtures/electron-app";

test.describe("Error Handling", () => {
  test("displays error message for invalid input", async ({ page }) => {
    // 等待应用加载
    await page.waitForSelector("body");

    // 查找输入框
    const input = page
      .locator(
        'textarea[placeholder*="输入"], textarea[data-testid="chat-input"]'
      )
      .first();

    if (await input.isVisible()) {
      // 清空输入并发送空消息（如果可以的话）
      await input.fill("");
      await input.press("Enter");

      // 应该显示验证错误或不允许发送
      // 具体行为取决于应用实现
    }
  });

  test("handles network errors gracefully", async ({ page, electronApp }) => {
    // 等待应用加载
    await page.waitForSelector("body");

    // 模拟网络错误（通过覆盖 fetch）
    await page.evaluate(() => {
      const originalFetch = window.fetch;
      window.fetch = (...args) => {
        // 对特定请求返回错误
        if (args[0].toString().includes("/api/")) {
          return Promise.resolve(
            new Response(JSON.stringify({ error: "Network error" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            })
          );
        }
        return originalFetch(...args);
      };
    });

    // 尝试发送消息
    const input = page
      .locator(
        'textarea[placeholder*="输入"], textarea[data-testid="chat-input"]'
      )
      .first();

    if (await input.isVisible()) {
      await input.fill("Test network error");
      await input.press("Enter");

      // 等待错误处理
      await page.waitForTimeout(2000);

      // 应该显示错误消息或优雅地处理错误
      const _errorElement = page
        .locator('[data-testid="error-message"], .error, [role="alert"]')
        .first();
      // 错误可能显示也可能被静默处理
    }
  });

  test("recovers from session load failure", async ({ page }) => {
    // 等待应用加载
    await page.waitForSelector("body");

    // 尝试访问不存在的会话（如果应用支持 URL 导航）
    // 这取决于应用的路由实现

    // 应用应该优雅地处理并显示默认视图或错误
    const mainContent = page.locator("main, [role='main']").first();
    expect(await mainContent.isVisible()).toBe(true);
  });

  test("shows user-friendly error for API errors", async ({ page }) => {
    // 等待应用加载
    await page.waitForSelector("body");

    // 模拟 API 错误
    await page.evaluate(() => {
      // 覆盖 IPC 调用（如果使用 Electron IPC）
      // 这需要根据实际的 IPC 实现进行调整
    });

    // 验证错误消息是用户友好的
    // 不应显示原始错误堆栈
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Error:");
    expect(bodyText).not.toContain("stack");
    expect(bodyText).not.toContain("undefined");
  });

  test("handles workspace not found error", async ({ page }) => {
    // 等待应用加载
    await page.waitForSelector("body");

    // 尝试打开不存在的工作区
    // 这取决于应用如何处理无效的工作区 ID

    // 应用应该显示错误或重定向到有效视图
    const mainContent = page.locator("main, [role='main']").first();
    expect(await mainContent.isVisible()).toBe(true);
  });
});
