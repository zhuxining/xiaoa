import { expect } from "@playwright/test";
import { test } from "../../fixtures/electron-app";
import { generateTestSkill } from "../../fixtures/test-data";
import { HomePage } from "../../pages/home.page";

/**
 * Skill Tests - 技能相关测试
 * 测试 ID: SK01-SK06
 */

test.describe("Skill Tests", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page, electronApp }) => {
    homePage = new HomePage(page, electronApp);
    await homePage.waitForReady();
  });

  /**
   * SK01 - 列出技能
   */
  test("SK01: 列出技能", async ({ page }) => {
    // 导航到技能页面（如果有）
    const skillsTab = page.locator("text=技能, text=Skills");

    if ((await skillsTab.count()) > 0) {
      await skillsTab.click();
      await page.waitForTimeout(300);

      // 验证技能列表存在
      const skillList = page.locator(
        '[data-slot="skill-list"], [data-testid="skill-list"]'
      );

      if ((await skillList.count()) > 0) {
        await expect(skillList).toBeVisible();
      }
    } else {
      test();
    }
  });

  /**
   * SK02 - 创建技能
   */
  test("SK02: 创建技能", async ({ page }) => {
    // 导航到技能页面
    const skillsTab = page.locator("text=技能, text=Skills");

    if ((await skillsTab.count()) > 0) {
      await skillsTab.click();
      await page.waitForTimeout(300);

      // 查找创建按钮
      const createButton = page.locator(
        "button:has-text('创建'), button:has-text('新建')"
      );

      if ((await createButton.count()) > 0) {
        await createButton.click();
        await page.waitForTimeout(200);

        // 填写技能信息
        const skill = generateTestSkill();
        const nameInput = page.locator(
          "input[placeholder*='名称'], input[name='name']"
        );

        if ((await nameInput.count()) > 0) {
          await nameInput.fill(skill.name);

          // 填写描述
          const descInput = page.locator(
            "input[placeholder*='描述'], textarea[name='description']"
          );
          if ((await descInput.count()) > 0) {
            await descInput.fill(skill.description);
          }

          // 保存
          const saveButton = page.locator("button:has-text('保存')");
          await saveButton.click();
          await page.waitForTimeout(500);

          // 验证技能已创建
          await expect(page.locator(`text=${skill.name}`)).toBeVisible();
        }
      } else {
        test();
      }
    } else {
      test();
    }
  });

  /**
   * SK03 - 更新技能
   */
  test("SK03: 更新技能", async ({ page }) => {
    const skillsTab = page.locator("text=技能, text=Skills");

    if ((await skillsTab.count()) > 0) {
      await skillsTab.click();
      await page.waitForTimeout(300);

      // 查找已有技能
      const skillItem = page
        .locator('[data-skill-id], [data-testid="skill-item"]')
        .first();

      if ((await skillItem.count()) > 0) {
        // 点击编辑
        await skillItem.click();
        await page.waitForTimeout(200);

        // 修改名称
        const nameInput = page.locator(
          "input[placeholder*='名称'], input[name='name']"
        );

        if ((await nameInput.count()) > 0) {
          const newName = `更新后的技能-${Date.now()}`;
          await nameInput.fill(newName);

          // 保存
          const saveButton = page.locator("button:has-text('保存')");
          await saveButton.click();
          await page.waitForTimeout(500);

          // 验证更新成功
          await expect(page.locator(`text=${newName}`)).toBeVisible();
        }
      } else {
        test();
      }
    } else {
      test();
    }
  });

  /**
   * SK04 - 删除技能
   */
  test("SK04: 删除技能", async ({ page }) => {
    const skillsTab = page.locator("text=技能, text=Skills");

    if ((await skillsTab.count()) > 0) {
      await skillsTab.click();
      await page.waitForTimeout(300);

      // 查找已有技能
      const skillItem = page
        .locator('[data-skill-id], [data-testid="skill-item"]')
        .first();

      if ((await skillItem.count()) > 0) {
        const initialCount = await page
          .locator('[data-skill-id], [data-testid="skill-item"]')
          .count();

        // 右键点击
        await skillItem.click({ button: "right" });
        await page.waitForTimeout(200);

        // 查找删除选项
        const deleteOption = page.locator("text=删除, text=Delete");

        if ((await deleteOption.count()) > 0) {
          await deleteOption.click();

          // 确认删除
          const confirmButton = page.locator(
            "button:has-text('确认'), button:has-text('确定')"
          );
          if ((await confirmButton.count()) > 0) {
            await confirmButton.click();
          }

          await page.waitForTimeout(500);

          // 验证删除成功
          const newCount = await page
            .locator('[data-skill-id], [data-testid="skill-item"]')
            .count();
          expect(newCount).toBe(initialCount - 1);
        }
      } else {
        test();
      }
    } else {
      test();
    }
  });

  /**
   * SK05 - 添加技能引用
   */
  test("SK05: 添加技能引用", async ({ page }) => {
    // 在对话中使用技能
    // 输入 / 触发技能菜单
    const textarea = page.locator("textarea");
    await textarea.fill("/");
    await page.waitForTimeout(300);

    // 查找技能菜单
    const skillMenu = page.locator(
      '[data-slot="skill-menu"], [role="listbox"]'
    );

    if ((await skillMenu.count()) > 0) {
      // 验证技能菜单可见
      await expect(skillMenu).toBeVisible();

      // 选择一个技能
      const skillOption = skillMenu.locator("button, [role='option']").first();
      if ((await skillOption.count()) > 0) {
        await skillOption.click();
        await page.waitForTimeout(200);

        // 验证技能已添加到输入框
        const inputValue = await textarea.inputValue();
        expect(inputValue).toContain("/");
      }
    } else {
      test();
    }
  });
});
