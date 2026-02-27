import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * 首页 Page Object
 * 对应 ChatView 组件的交互
 */
export class HomePage extends BasePage {
  // 选择器定义
  private readonly selectors = {
    // 页面容器
    chatView: '[data-slot="chat-view"]',
    sessionList: '[data-slot="session-list"]',

    // 会话列表
    newSessionButton: "button:has-text('新建会话')",
    sessionItem: (sessionId: string) => `[data-session-id="${sessionId}"]`,
    sessionItems: '[data-slot="session-list"] button[data-session-id]',
    noSessionsText: "text=暂无会话",

    // 消息区域
    messageInput: '[data-slot="message-input"]',
    messageTextarea: "textarea",
    sendButton: "button[type=submit], button:has(svg)", // 发送按钮包含 Send 图标
    abortButton: "button:has(svg)", // 中止按钮包含 Square 图标

    // 消息列表
    messageList: '[data-slot="agent-message-list"]',
    userMessage: '[data-role="user"]',
    assistantMessage: '[data-role="assistant"]',

    // 顶部工具栏
    agentName: "text=小A",
    settingsButton: "button:has(svg)", // 设置按钮
    modelSelector: "button:has-text('选择模型'), button:has-text('Claude')",

    // 权限对话框
    permissionDialog: '[role="alertdialog"]',
    permissionAllow: "button:has-text('允许')",
    permissionDeny: "button:has-text('拒绝')",
    permissionRemember: "#remember-in-session",
  };

  /**
   * 等待首页加载完成
   */
  async waitForReady(): Promise<void> {
    await this.waitForElement(this.selectors.chatView);
    await this.waitForElement(this.selectors.messageInput);
  }

  /**
   * 断言首页已显示
   */
  async assertPageLoaded(): Promise<void> {
    await this.assertVisible(this.selectors.chatView);
    await this.assertVisible(this.selectors.sessionList);
    await this.assertVisible(this.selectors.messageInput);
  }

  /**
   * 断言 Agent 名称正确
   */
  async assertAgentName(name = "小A"): Promise<void> {
    await this.assertText(this.selectors.chatView, name);
  }

  // ========== 会话操作 ==========

  /**
   * 创建新会话
   */
  async createNewSession(): Promise<void> {
    await this.click(this.selectors.newSessionButton);
    await this.wait(500); // 等待会话创建
  }

  /**
   * 选择会话
   */
  async selectSession(sessionId: string): Promise<void> {
    await this.click(this.selectors.sessionItem(sessionId));
  }

  /**
   * 获取会话数量
   */
  async getSessionCount(): Promise<number> {
    const items = await this.page.$$(
      '[data-slot="session-list"] button[data-session-id]'
    );
    return items.length;
  }

  /**
   * 断言没有会话
   */
  async assertNoSessions(): Promise<void> {
    await this.assertVisible(this.selectors.noSessionsText);
  }

  /**
   * 断言会话数量
   */
  async assertSessionCount(count: number): Promise<void> {
    const actualCount = await this.getSessionCount();
    expect(actualCount).toBe(count);
  }

  // ========== 消息操作 ==========

  /**
   * 输入消息
   */
  async inputMessage(message: string): Promise<void> {
    await this.fill(this.selectors.messageTextarea, message);
  }

  /**
   * 发送消息
   */
  async sendMessage(message: string): Promise<void> {
    await this.inputMessage(message);
    await this.press("Enter");
    await this.wait(300);
  }

  /**
   * 点击发送按钮
   */
  async clickSendButton(): Promise<void> {
    // 找到发送按钮（不是中止按钮）
    const sendButton = this.page
      .locator(this.selectors.messageInput)
      .locator("button")
      .last();
    await sendButton.click();
  }

  /**
   * 中止生成
   */
  async abortGeneration(): Promise<void> {
    const abortButton = this.page
      .locator(this.selectors.messageInput)
      .locator("button:has(svg)");
    await abortButton.click();
  }

  /**
   * 断言正在生成
   */
  async assertIsGenerating(): Promise<void> {
    // 生成时中止按钮可见
    const abortButton = this.page.locator(
      'button[variant="destructive"], button:has(.lucide-square)'
    );
    await expect(abortButton).toBeVisible({ timeout: 5000 });
  }

  /**
   * 断言不在生成
   */
  async assertNotGenerating(): Promise<void> {
    // 不生成时发送按钮可见
    const sendButton = this.page.locator("button:has(.lucide-send)");
    await expect(sendButton).toBeVisible();
  }

  /**
   * 获取消息数量
   */
  async getMessageCount(): Promise<number> {
    const messages = await this.page.$$(
      '[data-role="user"], [data-role="assistant"]'
    );
    return messages.length;
  }

  /**
   * 断言消息数量
   */
  async assertMessageCount(count: number): Promise<void> {
    const actualCount = await this.getMessageCount();
    expect(actualCount).toBeGreaterThanOrEqual(count);
  }

  // ========== 模型选择 ==========

  /**
   * 打开模型选择器
   */
  async openModelSelector(): Promise<void> {
    await this.click(this.selectors.modelSelector);
  }

  /**
   * 选择模型
   */
  async selectModel(modelName: string): Promise<void> {
    await this.openModelSelector();
    await this.click(`text=${modelName}`);
    await this.wait(300);
  }

  // ========== 权限处理 ==========

  /**
   * 等待权限对话框出现
   */
  async waitForPermissionDialog(timeout = 10_000): Promise<void> {
    await this.waitForElement(this.selectors.permissionDialog, timeout);
  }

  /**
   * 允许权限请求
   */
  async allowPermission(): Promise<void> {
    await this.click(this.selectors.permissionAllow);
  }

  /**
   * 拒绝权限请求
   */
  async denyPermission(): Promise<void> {
    await this.click(this.selectors.permissionDeny);
  }

  /**
   * 勾选"本次会话始终允许"
   */
  async checkRememberInSession(): Promise<void> {
    await this.click(this.selectors.permissionRemember);
  }

  /**
   * 断言权限对话框可见
   */
  async assertPermissionDialogVisible(): Promise<void> {
    await this.assertVisible(this.selectors.permissionDialog);
  }

  /**
   * 断言权限对话框不可见
   */
  async assertPermissionDialogNotVisible(): Promise<void> {
    await this.waitForElementHidden(this.selectors.permissionDialog);
  }

  // ========== 导航 ==========

  /**
   * 导航到设置页面
   */
  async goToSettings(): Promise<void> {
    await this.click('button:has(svg[class*="lucide-settings"])');
    await this.waitForNavigation(/settings/);
  }
}
