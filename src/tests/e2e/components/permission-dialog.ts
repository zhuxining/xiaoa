import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * 权限对话框组件 Page Object
 */
export class PermissionDialogComponent {
  constructor(private readonly page: Page) {}

  private readonly selectors = {
    dialog: '[role="alertdialog"]',
    title: '[role="alertdialog"] h2',
    description: '[role="alertdialog"] [data-description]',
    details: '[role="alertdialog"] pre',
    riskIndicator: "text=风险等级",
    allowButton: "button:has-text('允许')",
    denyButton: "button:has-text('拒绝')",
    rememberCheckbox: "#remember-in-session",
    rememberLabel: "text=本次会话始终允许",
  };

  /**
   * 等待对话框出现
   */
  async waitForDialog(timeout = 10_000): Promise<void> {
    await this.page.waitForSelector(this.selectors.dialog, { timeout });
  }

  /**
   * 等待对话框消失
   */
  async waitForDialogHidden(timeout = 5000): Promise<void> {
    await this.page.waitForSelector(this.selectors.dialog, {
      state: "hidden",
      timeout,
    });
  }

  /**
   * 允许权限
   */
  async allow(): Promise<void> {
    await this.page.click(this.selectors.allowButton);
  }

  /**
   * 拒绝权限
   */
  async deny(): Promise<void> {
    await this.page.click(this.selectors.denyButton);
  }

  /**
   * 勾选"本次会话始终允许"
   */
  async checkRemember(): Promise<void> {
    await this.page.check(this.selectors.rememberCheckbox);
  }

  /**
   * 取消勾选"本次会话始终允许"
   */
  async uncheckRemember(): Promise<void> {
    await this.page.uncheck(this.selectors.rememberCheckbox);
  }

  /**
   * 获取标题
   */
  async getTitle(): Promise<string | null> {
    return this.page.textContent(this.selectors.title);
  }

  /**
   * 获取描述
   */
  async getDescription(): Promise<string | null> {
    return this.page.textContent(this.selectors.description);
  }

  /**
   * 获取详情
   */
  async getDetails(): Promise<string | null> {
    const element = this.page.locator(this.selectors.details);
    if ((await element.count()) === 0) {
      return null;
    }
    return element.textContent();
  }

  /**
   * 获取风险等级
   */
  async getRiskLevel(): Promise<"low" | "medium" | "high" | null> {
    const text = await this.page.textContent(this.selectors.riskIndicator);
    if (!text) {
      return null;
    }
    if (text.includes("低")) {
      return "low";
    }
    if (text.includes("中")) {
      return "medium";
    }
    if (text.includes("高")) {
      return "high";
    }
    return null;
  }

  /**
   * 断言对话框可见
   */
  async assertVisible(): Promise<void> {
    await expect(this.page.locator(this.selectors.dialog)).toBeVisible();
  }

  /**
   * 断言对话框不可见
   */
  async assertNotVisible(): Promise<void> {
    await expect(this.page.locator(this.selectors.dialog)).not.toBeVisible();
  }

  /**
   * 断言标题
   */
  async assertTitle(title: string): Promise<void> {
    await expect(this.page.locator(this.selectors.title)).toHaveText(title);
  }

  /**
   * 断言描述包含
   */
  async assertDescriptionContains(text: string): Promise<void> {
    await expect(this.page.locator(this.selectors.description)).toContainText(
      text
    );
  }

  /**
   * 断言风险等级
   */
  async assertRiskLevel(level: "low" | "medium" | "high"): Promise<void> {
    const levelText = {
      low: "低",
      medium: "中",
      high: "高",
    };
    await expect(
      this.page.locator(
        `${this.selectors.riskIndicator}:contains("${levelText[level]}")`
      )
    ).toBeVisible();
  }
}
