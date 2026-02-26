import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * 对话视图组件 Page Object
 */
export class ChatViewComponent {
  constructor(private readonly page: Page) {}

  private readonly selectors = {
    container: '[data-slot="chat-view"]',
    messageList: '[data-slot="agent-message-list"]',
    messageInput: '[data-slot="message-input"]',
    textarea: "textarea",
    sendButton: "button:has(.lucide-send)",
    abortButton: "button:has(.lucide-square)",
    userMessage: '[data-role="user"]',
    assistantMessage: '[data-role="assistant"]',
    toolMessage: '[data-role="tool"]',
    streamingIndicator: ".animate-pulse, [data-streaming=true]",
  };

  /**
   * 等待组件加载
   */
  async waitForReady(): Promise<void> {
    await this.page.waitForSelector(this.selectors.container);
    await this.page.waitForSelector(this.selectors.messageInput);
  }

  /**
   * 输入消息
   */
  async inputMessage(text: string): Promise<void> {
    await this.page.fill(this.selectors.textarea, text);
  }

  /**
   * 发送消息
   */
  async sendMessage(text: string): Promise<void> {
    await this.inputMessage(text);
    await this.page.keyboard.press("Enter");
  }

  /**
   * 点击发送按钮
   */
  async clickSend(): Promise<void> {
    await this.page.click(this.selectors.sendButton);
  }

  /**
   * 中止生成
   */
  async abort(): Promise<void> {
    await this.page.click(this.selectors.abortButton);
  }

  /**
   * 获取消息数量
   */
  async getMessageCount(): Promise<number> {
    return this.page
      .locator('[data-role="user"], [data-role="assistant"]')
      .count();
  }

  /**
   * 获取最后一条消息
   */
  async getLastMessage(): Promise<string | null> {
    const messages = this.page.locator('[data-role="user"], [data-role="assistant"]');
    const count = await messages.count();
    if (count === 0) return null;
    return messages.nth(count - 1).textContent();
  }

  /**
   * 断言正在生成
   */
  async assertIsGenerating(): Promise<void> {
    await expect(this.page.locator(this.selectors.abortButton)).toBeVisible();
  }

  /**
   * 断言不在生成
   */
  async assertNotGenerating(): Promise<void> {
    await expect(this.page.locator(this.selectors.sendButton)).toBeVisible();
  }

  /**
   * 断言消息数量
   */
  async assertMessageCount(count: number): Promise<void> {
    const actualCount = await this.getMessageCount();
    expect(actualCount).toBeGreaterThanOrEqual(count);
  }

  /**
   * 断言包含消息
   */
  async assertContainsMessage(text: string): Promise<void> {
    await expect(this.page.locator(this.selectors.messageList)).toContainText(text);
  }
}
