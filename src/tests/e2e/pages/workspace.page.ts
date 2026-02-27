import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * 工作区页面 Page Object
 */
export class WorkspacePage extends BasePage {
  private readonly selectors = {
    // 工作区列表
    workspaceList: '[data-slot="workspace-list"]',
    workspaceItem: (id: string) => `[data-workspace-id="${id}"]`,
    createWorkspaceButton: "button:has-text('创建工作区')",
    createWorkspaceDialog: '[role="dialog"]:has-text("创建工作区")',

    // 工作区表单
    workspaceNameInput: "input[placeholder*='名称'], input[name='name']",
    workspacePathInput: "input[placeholder*='路径'], input[name='path']",
    confirmCreateButton: "button:has-text('创建')",
    cancelButton: "button:has-text('取消')",

    // 工作区详情
    workspaceHeader: '[data-slot="workspace-header"]',
    workspaceName: '[data-slot="workspace-name"]',

    // Agent 配置
    agentConfigForm: '[data-slot="agent-config-form"]',
    permissionModeSelect: "select[name='permissionMode'], [role=combobox]",

    // 导航
    skillsTab: "text=技能",
    knowledgeTab: "text=知识库",
    memoriesTab: "text=记忆",
    agentTab: "text=Agent",
  };

  // ========== 工作区列表 ==========

  /**
   * 等待工作区页面加载
   */
  async waitForReady(): Promise<void> {
    await this.waitForElement(this.selectors.workspaceList);
  }

  /**
   * 打开创建工作区对话框
   */
  async openCreateDialog(): Promise<void> {
    await this.click(this.selectors.createWorkspaceButton);
    await this.waitForElement(this.selectors.createWorkspaceDialog);
  }

  /**
   * 创建工作区
   */
  async createWorkspace(name: string, path?: string): Promise<void> {
    await this.openCreateDialog();
    await this.fill(this.selectors.workspaceNameInput, name);
    if (path) {
      await this.fill(this.selectors.workspacePathInput, path);
    }
    await this.click(this.selectors.confirmCreateButton);
    await this.wait(500);
  }

  /**
   * 取消创建工作区
   */
  async cancelCreate(): Promise<void> {
    await this.click(this.selectors.cancelButton);
  }

  /**
   * 选择工作区
   */
  async selectWorkspace(id: string): Promise<void> {
    await this.click(this.selectors.workspaceItem(id));
  }

  /**
   * 获取工作区数量
   */
  async getWorkspaceCount(): Promise<number> {
    const items = await this.page.$$("[data-workspace-id]");
    return items.length;
  }

  /**
   * 断言工作区数量
   */
  async assertWorkspaceCount(count: number): Promise<void> {
    const actualCount = await this.getWorkspaceCount();
    expect(actualCount).toBe(count);
  }

  /**
   * 断言工作区存在
   */
  async assertWorkspaceExists(name: string): Promise<void> {
    await this.assertVisible(`text=${name}`);
  }

  /**
   * 断言工作区不存在
   */
  async assertWorkspaceNotExists(name: string): Promise<void> {
    await expect(this.page.locator(`text=${name}`)).not.toBeVisible();
  }

  // ========== 工作区详情 ==========

  /**
   * 导航到技能页
   */
  async goToSkills(): Promise<void> {
    await this.click(this.selectors.skillsTab);
  }

  /**
   * 导航到知识库页
   */
  async goToKnowledge(): Promise<void> {
    await this.click(this.selectors.knowledgeTab);
  }

  /**
   * 导航到记忆页
   */
  async goToMemories(): Promise<void> {
    await this.click(this.selectors.memoriesTab);
  }

  /**
   * 导航到 Agent 配置页
   */
  async goToAgentConfig(): Promise<void> {
    await this.click(this.selectors.agentTab);
  }

  // ========== Agent 配置 ==========

  /**
   * 更新权限模式
   */
  async updatePermissionMode(mode: "ask" | "auto"): Promise<void> {
    await this.goToAgentConfig();
    const select = this.page.locator(this.selectors.permissionModeSelect);
    await select.click();
    await this.page.click(`text=${mode === "ask" ? "询问" : "自动"}`);
  }

  /**
   * 断言权限模式
   */
  async assertPermissionMode(mode: string): Promise<void> {
    await this.assertText(this.selectors.agentConfigForm, mode);
  }
}
