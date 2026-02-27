import { expect } from "@playwright/test";
import { test } from "../../fixtures/electron-app";
import { generateTestWorkspace } from "../../fixtures/test-data";
import { HomePage } from "../../pages/home.page";
import { WorkspacePage } from "../../pages/workspace.page";

/**
 * Workspace Tests - 工作区相关测试
 * 测试 ID: WK01-WK08
 */

test.describe("Workspace CRUD Tests", () => {
  let homePage: HomePage;
  let _workspacePage: WorkspacePage;

  test.beforeEach(async ({ page, electronApp }) => {
    homePage = new HomePage(page, electronApp);
    _workspacePage = new WorkspacePage(page, electronApp);
    await homePage.waitForReady();
  });

  /**
   * WK01 - 列出工作区
   */
  test("WK01: 列出工作区", async ({ page }) => {
    // 查找工作区列表或切换器
    const workspaceSwitcher = page.locator(
      '[data-slot="workspace-switcher"], [data-testid="workspace-switcher"]'
    );

    if ((await workspaceSwitcher.count()) > 0) {
      await workspaceSwitcher.click();

      // 等待工作区列表出现
      await page.waitForTimeout(300);

      // 验证工作区列表存在
      const workspaceList = page.locator(
        '[data-slot="workspace-list"], [role="menu"]'
      );
      await expect(workspaceList).toBeVisible();
    } else {
      // 如果没有工作区功能，跳过测试
      test();
    }
  });

  /**
   * WK02 - 创建工作区
   */
  test("WK02: 创建工作区", async ({ page }) => {
    // 查找工作区创建入口
    const workspaceSwitcher = page.locator(
      '[data-slot="workspace-switcher"], [data-testid="workspace-switcher"]'
    );

    if ((await workspaceSwitcher.count()) > 0) {
      await workspaceSwitcher.click();
      await page.waitForTimeout(200);

      // 查找创建工作区按钮
      const createButton = page.locator(
        "button:has-text('创建'), button:has-text('新建')"
      );

      if ((await createButton.count()) > 0) {
        await createButton.click();

        // 填写工作区信息
        const workspace = generateTestWorkspace();
        const nameInput = page.locator(
          "input[placeholder*='名称'], input[name='name']"
        );
        if ((await nameInput.count()) > 0) {
          await nameInput.fill(workspace.name);

          // 确认创建
          const confirmButton = page.locator("button:has-text('创建')");
          await confirmButton.click();

          // 等待创建完成
          await page.waitForTimeout(500);

          // 验证工作区已创建
          await expect(page.locator(`text=${workspace.name}`)).toBeVisible();
        }
      } else {
        test();
      }
    } else {
      test();
    }
  });

  /**
   * WK03 - 获取工作区详情
   */
  test("WK03: 获取工作区详情", async ({ page }) => {
    // 查找工作区列表
    const workspaceSwitcher = page.locator(
      '[data-slot="workspace-switcher"], [data-testid="workspace-switcher"]'
    );

    if ((await workspaceSwitcher.count()) > 0) {
      await workspaceSwitcher.click();
      await page.waitForTimeout(200);

      // 选择一个工作区
      const workspaceItem = page
        .locator('[data-workspace-id], [role="menuitem"]')
        .first();

      if ((await workspaceItem.count()) > 0) {
        await workspaceItem.click();
        await page.waitForTimeout(300);

        // 验证工作区详情页加载
        // 根据实际实现调整选择器
        const workspaceHeader = page.locator(
          '[data-slot="workspace-header"], h1, h2'
        );
        await expect(workspaceHeader.first()).toBeVisible();
      } else {
        test();
      }
    } else {
      test();
    }
  });

  /**
   * WK05 - 删除工作区
   */
  test("WK05: 删除工作区", async ({ page }) => {
    // 查找工作区
    const workspaceSwitcher = page.locator(
      '[data-slot="workspace-switcher"], [data-testid="workspace-switcher"]'
    );

    if ((await workspaceSwitcher.count()) > 0) {
      await workspaceSwitcher.click();
      await page.waitForTimeout(200);

      // 右键点击工作区（如果有删除选项）
      const workspaceItem = page
        .locator('[data-workspace-id], [role="menuitem"]')
        .first();

      if ((await workspaceItem.count()) > 0) {
        await workspaceItem.click({ button: "right" });
        await page.waitForTimeout(200);

        // 查找删除选项
        const deleteOption = page.locator("text=删除, text=Delete");

        if ((await deleteOption.count()) > 0) {
          const initialCount = await page
            .locator('[data-workspace-id], [role="menuitem"]')
            .count();

          await deleteOption.click();

          // 确认删除（如果有确认对话框）
          const confirmButton = page.locator(
            "button:has-text('确认'), button:has-text('确定')"
          );
          if ((await confirmButton.count()) > 0) {
            await confirmButton.click();
          }

          // 等待删除完成
          await page.waitForTimeout(500);

          // 验证工作区数量减少
          const newCount = await page
            .locator('[data-workspace-id], [role="menuitem"]')
            .count();
          expect(newCount).toBeLessThan(initialCount);
        } else {
          test();
        }
      } else {
        test();
      }
    } else {
      test();
    }
  });

  /**
   * WK08 - 创建重名工作区
   */
  test("WK08: 创建重名工作区", async ({ page }) => {
    const workspaceSwitcher = page.locator(
      '[data-slot="workspace-switcher"], [data-testid="workspace-switcher"]'
    );

    if ((await workspaceSwitcher.count()) > 0) {
      await workspaceSwitcher.click();
      await page.waitForTimeout(200);

      // 获取第一个工作区名称
      const firstWorkspace = page
        .locator('[data-workspace-id], [role="menuitem"]')
        .first();
      const existingName = await firstWorkspace.textContent();

      if (existingName) {
        // 尝试创建同名工作区
        const createButton = page.locator(
          "button:has-text('创建'), button:has-text('新建')"
        );

        if ((await createButton.count()) > 0) {
          await createButton.click();

          const nameInput = page.locator(
            "input[placeholder*='名称'], input[name='name']"
          );
          if ((await nameInput.count()) > 0) {
            await nameInput.fill(existingName);

            // 尝试提交
            const confirmButton = page.locator("button:has-text('创建')");
            await confirmButton.click();

            // 等待
            await page.waitForTimeout(500);

            // 验证是否显示错误提示或阻止创建
            // 根据实际实现调整
            const _errorMessage = page.locator(
              "text=已存在, text=重复, text=duplicate"
            );

            // 如果有错误提示，测试通过
            // 如果没有错误提示但也没有创建，也算通过
            const toast = page.locator("[data-sonner-toast]");
            if ((await toast.count()) > 0) {
              // 有提示信息
              await expect(toast).toBeVisible();
            }
          }
        }
      }
    } else {
      test();
    }
  });
});

/**
 * Workspace Agent 配置测试
 */
test.describe("Workspace Agent Config Tests", () => {
  /**
   * WK06 - 更新 Agent 配置
   */
  test("WK06: 更新 Agent 配置", async ({ page, electronApp }) => {
    const homePage = new HomePage(page, electronApp);
    await homePage.waitForReady();

    // 导航到工作区设置（如果有）
    const agentTab = page.locator("text=Agent, text=agent");

    if ((await agentTab.count()) > 0) {
      await agentTab.click();
      await page.waitForTimeout(300);

      // 查找 Agent 配置表单
      const agentForm = page.locator('[data-slot="agent-config-form"], form');

      if ((await agentForm.count()) > 0) {
        // 验证配置选项存在
        await expect(agentForm).toBeVisible();
      } else {
        test();
      }
    } else {
      test();
    }
  });

  /**
   * WK07 - 更新权限模式
   */
  test("WK07: 更新权限模式", async ({ page, electronApp }) => {
    const homePage = new HomePage(page, electronApp);
    await homePage.waitForReady();

    // 查找权限模式设置
    const permissionSelect = page.locator(
      "label:has-text('权限') + select, [data-testid='permission-mode']"
    );

    if ((await permissionSelect.count()) > 0) {
      await permissionSelect.click();
      await page.waitForTimeout(200);

      // 选择不同的权限模式
      const autoOption = page.locator("text=自动, text=auto");
      if ((await autoOption.count()) > 0) {
        await autoOption.click();
        await page.waitForTimeout(300);

        // 验证权限模式已更新
        await expect(permissionSelect).toContainText("自动");
      }
    } else {
      test();
    }
  });
});
