import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * 会话列表组件 Page Object
 */
export class SessionListComponent {
  private readonly page: Page;
  private readonly selectors = {
    container: '[data-slot="session-list"]',
    newSessionButton: "button:has-text('新建会话')",
    sessionItem: "button[data-session-id]",
    sessionItemById: (id: string) => `button[data-session-id="${id}"]`,
    noSessionsText: "text=暂无会话",
    sessionTitle: ".font-medium",
    messageCount: ".text-xs",
  };

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * 等待组件加载
   */
  async waitForReady(): Promise<void> {
    await this.page.waitForSelector(this.selectors.container);
  }

  /**
   * 创建新会话
   */
  async createNewSession(): Promise<void> {
    await this.page.click(this.selectors.newSessionButton);
  }

  /**
   * 选择会话
   */
  async selectSession(id: string): Promise<void> {
    await this.page.click(this.selectors.sessionItemById(id));
  }

  /**
   * 获取会话数量
   */
  async getSessionCount(): Promise<number> {
    return this.page.locator(this.selectors.sessionItem).count();
  }

  /**
   * 获取所有会话标题
   */
  async getSessionTitles(): Promise<string[]> {
    const titles = this.page.locator(this.selectors.sessionTitle);
    const count = await titles.count();
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await titles.nth(i).textContent();
      if (text) {
        result.push(text);
      }
    }
    return result;
  }

  /**
   * 获取选中的会话 ID
   */
  async getSelectedSessionId(): Promise<string | null> {
    const selected = this.page.locator(
      `${this.selectors.sessionItem}.bg-muted`
    );
    if ((await selected.count()) === 0) {
      return null;
    }
    return selected.getAttribute("data-session-id");
  }

  /**
   * 断言会话数量
   */
  async assertSessionCount(count: number): Promise<void> {
    const actualCount = await this.getSessionCount();
    expect(actualCount).toBe(count);
  }

  /**
   * 断言没有会话
   */
  async assertNoSessions(): Promise<void> {
    await expect(
      this.page.locator(this.selectors.noSessionsText)
    ).toBeVisible();
  }

  /**
   * 断言会话存在
   */
  async assertSessionExists(title: string): Promise<void> {
    await expect(
      this.page.locator(`${this.selectors.container}:has-text("${title}")`)
    ).toBeVisible();
  }

  /**
   * 断言会话被选中
   */
  async assertSessionSelected(id: string): Promise<void> {
    const selected = this.page.locator(
      `${this.selectors.sessionItemById(id)}.bg-muted`
    );
    await expect(selected).toBeVisible();
  }
}
