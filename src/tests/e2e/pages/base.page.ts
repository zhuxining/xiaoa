import type { ElectronApplication, Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * 基础 Page Object
 * 所有 Page Objects 的基类，提供通用方法
 */
export abstract class BasePage {
  constructor(
    protected readonly page: Page,
    protected readonly electronApp: ElectronApplication
  ) {}

  /**
   * 等待页面加载完成
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState("domcontentloaded");
  }

  /**
   * 等待元素出现
   */
  async waitForElement(selector: string, timeout = 10_000): Promise<void> {
    await this.page.waitForSelector(selector, { timeout });
  }

  /**
   * 等待元素消失
   */
  async waitForElementHidden(
    selector: string,
    timeout = 10_000
  ): Promise<void> {
    await this.page.waitForSelector(selector, { state: "hidden", timeout });
  }

  /**
   * 点击元素
   */
  async click(selector: string): Promise<void> {
    await this.page.click(selector);
  }

  /**
   * 填写输入框
   */
  async fill(selector: string, value: string): Promise<void> {
    await this.page.fill(selector, value);
  }

  /**
   * 获取元素文本
   */
  async getText(selector: string): Promise<string | null> {
    return this.page.textContent(selector);
  }

  /**
   * 检查元素是否可见
   */
  async isVisible(selector: string): Promise<boolean> {
    return this.page.isVisible(selector);
  }

  /**
   * 等待指定时间
   */
  async wait(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /**
   * 截图
   */
  async screenshot(path: string): Promise<Buffer> {
    return this.page.screenshot({ path });
  }

  /**
   * 等待导航完成
   */
  async waitForNavigation(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForURL(urlPattern);
  }

  /**
   * 获取当前 URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * 刷新页面
   */
  async reload(): Promise<void> {
    await this.page.reload();
  }

  /**
   * 执行脚本
   */
  async evaluate<T>(fn: () => T): Promise<T> {
    return this.page.evaluate(fn);
  }

  /**
   * 按下键盘按键
   */
  async press(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * 输入文本
   */
  async type(text: string): Promise<void> {
    await this.page.keyboard.type(text);
  }

  /**
   * 断言元素可见
   */
  async assertVisible(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  /**
   * 断言元素包含文本
   */
  async assertText(selector: string, text: string | RegExp): Promise<void> {
    await expect(this.page.locator(selector)).toContainText(text);
  }

  /**
   * 断言元素文本等于
   */
  async assertTextEquals(selector: string, text: string): Promise<void> {
    await expect(this.page.locator(selector)).toHaveText(text);
  }

  /**
   * 断言元素数量
   */
  async assertCount(selector: string, count: number): Promise<void> {
    await expect(this.page.locator(selector)).toHaveCount(count);
  }

  /**
   * 获取 Electron 应用窗口
   */
  async getWindows(): Promise<Page[]> {
    return this.electronApp.windows();
  }

  /**
   * 获取控制台消息
   */
  getConsoleMessages(): string[] {
    const messages: string[] = [];
    this.page.on("console", (msg) => {
      messages.push(msg.text());
    });
    return messages;
  }
}
