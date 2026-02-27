import { BasePage } from "./base.page";

/**
 * 设置页面 Page Object
 */
export class SettingsPage extends BasePage {
  private readonly selectors = {
    // 页面容器
    pageHeader: "text=设置",
    pageDescription: "text=配置应用程序",

    // LLM 配置表单
    llmConfigForm: '[data-slot="llm-config-form"]',
    providerSelect: "select, [role=combobox]",
    apiKeyInput: "input[placeholder*='API'], input[type=password]",
    modelSelect: "select, button:has-text('Claude')",

    // 外观配置表单
    appearanceForm: '[data-slot="appearance-form"]',
    themeSelect: "select, [role=combobox]",
    languageSelect: "select, [role=combobox]",

    // 按钮
    saveButton: "button:has-text('保存')",
    testConnectionButton: "button:has-text('测试连接')",

    // Toast
    toast: "[data-sonner-toast]",
    toastSuccess: '[data-sonner-toast][data-type="success"]',
    toastError: '[data-sonner-toast][data-type="error"]',

    // 关于部分
    aboutSection: "text=关于",
  };

  /**
   * 等待设置页面加载完成
   */
  async waitForReady(): Promise<void> {
    await this.waitForElement(this.selectors.pageHeader);
  }

  /**
   * 断言设置页面已加载
   */
  async assertPageLoaded(): Promise<void> {
    await this.assertVisible(this.selectors.pageHeader);
    await this.assertVisible(this.selectors.saveButton);
  }

  // ========== LLM 配置 ==========

  /**
   * 选择 Provider
   */
  async selectProvider(provider: string): Promise<void> {
    const select = this.page
      .locator("label:has-text('Provider')")
      .locator("..")
      .locator("select, [role=combobox]");
    await select.click();
    await this.page.click(`text=${provider}`);
  }

  /**
   * 输入 API Key
   */
  async inputApiKey(apiKey: string): Promise<void> {
    const input = this.page
      .locator("input[placeholder*='API'], input[type=password]")
      .first();
    await input.fill(apiKey);
  }

  /**
   * 选择模型
   */
  async selectModel(model: string): Promise<void> {
    const modelSelect = this.page
      .locator("label:has-text('模型')")
      .locator("..")
      .locator("select, [role=combobox]");
    await modelSelect.click();
    await this.page.click(`text=${model}`);
  }

  /**
   * 填写 LLM 配置
   */
  async fillLLMConfig(config: {
    provider?: string;
    apiKey?: string;
    model?: string;
  }): Promise<void> {
    if (config.provider) {
      await this.selectProvider(config.provider);
    }
    if (config.apiKey) {
      await this.inputApiKey(config.apiKey);
    }
    if (config.model) {
      await this.selectModel(config.model);
    }
  }

  // ========== 外观配置 ==========

  /**
   * 选择主题
   */
  async selectTheme(theme: "light" | "dark" | "system"): Promise<void> {
    const themeSelect = this.page
      .locator("label:has-text('主题')")
      .locator("..")
      .locator("select, [role=combobox]");
    await themeSelect.click();
    await this.page.click(
      `text=${theme === "light" ? "浅色" : theme === "dark" ? "深色" : "跟随系统"}`
    );
  }

  /**
   * 选择语言
   */
  async selectLanguage(language: "zh-CN" | "en-US"): Promise<void> {
    const langSelect = this.page
      .locator("label:has-text('语言')")
      .locator("..")
      .locator("select, [role=combobox]");
    await langSelect.click();
    await this.page.click(
      `text=${language === "zh-CN" ? "简体中文" : "English"}`
    );
  }

  /**
   * 填写外观配置
   */
  async fillAppearanceConfig(config: {
    theme?: "light" | "dark" | "system";
    language?: "zh-CN" | "en-US";
  }): Promise<void> {
    if (config.theme) {
      await this.selectTheme(config.theme);
    }
    if (config.language) {
      await this.selectLanguage(config.language);
    }
  }

  // ========== 操作 ==========

  /**
   * 保存设置
   */
  async saveSettings(): Promise<void> {
    await this.click(this.selectors.saveButton);
    await this.wait(500);
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<void> {
    await this.click(this.selectors.testConnectionButton);
    await this.wait(1000);
  }

  /**
   * 断言保存成功
   */
  async assertSaveSuccess(): Promise<void> {
    await this.assertVisible(this.selectors.toastSuccess);
  }

  /**
   * 断言保存失败
   */
  async assertSaveFailed(): Promise<void> {
    await this.assertVisible(this.selectors.toastError);
  }

  /**
   * 断言测试连接成功
   */
  async assertTestConnectionSuccess(): Promise<void> {
    await this.assertText(this.selectors.toastSuccess, "连接成功");
  }

  /**
   * 断言测试连接失败
   */
  async assertTestConnectionFailed(): Promise<void> {
    await this.assertVisible(this.selectors.toastError);
  }

  // ========== 导航 ==========

  /**
   * 返回首页
   */
  async goBack(): Promise<void> {
    await this.page.goBack();
    await this.waitForNavigation(/\/$/);
  }
}
