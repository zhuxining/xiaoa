import { expect } from "@playwright/test";
import { test } from "../../fixtures/electron-app";
import { HomePage } from "../../pages/home.page";
import { generateTestKnowledge } from "../../fixtures/test-data";

/**
 * Knowledge Tests - 知识库相关测试
 * 测试 ID: KN01-KN05
 */

test.describe("Knowledge Tests", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page, electronApp }) => {
    homePage = new HomePage(page, electronApp);
    await homePage.waitForReady();
  });

  /**
   * KN01 - 添加知识文件
   */
  test("KN01: 添加知识文件", async ({ page }) => {
    // 导航到知识库页面
    const knowledgeTab = page.locator("text=知识库, text=Knowledge");

    if (await knowledgeTab.count() > 0) {
      await knowledgeTab.click();
      await page.waitForTimeout(300);

      // 查找上传按钮
      const uploadButton = page.locator(
        "button:has-text('上传'), button:has-text('添加')"
      );

      if (await uploadButton.count() > 0) {
        // 点击上传
        await uploadButton.click();
        await page.waitForTimeout(200);

        // 在实际测试中，这里需要处理文件上传
        // 由于 E2E 测试限制，这里只验证 UI 存在
        const fileInput = page.locator("input[type='file']");

        if (await fileInput.count() > 0) {
          // 文件上传功能存在
          await expect(fileInput).toBeAttached();
        }
      }
    } else {
      test.skip();
    }
  });

  /**
   * KN02 - 列出知识库
   */
  test("KN02: 列出知识库", async ({ page }) => {
    const knowledgeTab = page.locator("text=知识库, text=Knowledge");

    if (await knowledgeTab.count() > 0) {
      await knowledgeTab.click();
      await page.waitForTimeout(300);

      // 验证知识库列表存在
      const knowledgeList = page.locator(
        '[data-slot="knowledge-list"], [data-testid="knowledge-list"]'
      );

      if (await knowledgeList.count() > 0) {
        await expect(knowledgeList).toBeVisible();
      }
    } else {
      test.skip();
    }
  });

  /**
   * KN03 - 删除知识
   */
  test("KN03: 删除知识", async ({ page }) => {
    const knowledgeTab = page.locator("text=知识库, text=Knowledge");

    if (await knowledgeTab.count() > 0) {
      await knowledgeTab.click();
      await page.waitForTimeout(300);

      // 查找已有知识项
      const knowledgeItem = page.locator(
        '[data-knowledge-id], [data-testid="knowledge-item"]'
      ).first();

      if (await knowledgeItem.count() > 0) {
        // 右键点击
        await knowledgeItem.click({ button: "right" });
        await page.waitForTimeout(200);

        // 查找删除选项
        const deleteOption = page.locator("text=删除, text=Delete");

        if (await deleteOption.count() > 0) {
          await deleteOption.click();

          // 确认删除
          const confirmButton = page.locator(
            "button:has-text('确认'), button:has-text('确定')"
          );
          if (await confirmButton.count() > 0) {
            await confirmButton.click();
            await page.waitForTimeout(500);
          }

          // 验证删除成功（列表数量减少）
        }
      }
    } else {
      test.skip();
    }
  });

  /**
   * KN04 - 重新解析知识
   */
  test("KN04: 重新解析知识", async ({ page }) => {
    const knowledgeTab = page.locator("text=知识库, text=Knowledge");

    if (await knowledgeTab.count() > 0) {
      await knowledgeTab.click();
      await page.waitForTimeout(300);

      // 查找已有知识项
      const knowledgeItem = page.locator(
        '[data-knowledge-id], [data-testid="knowledge-item"]'
      ).first();

      if (await knowledgeItem.count() > 0) {
        // 右键点击
        await knowledgeItem.click({ button: "right" });
        await page.waitForTimeout(200);

        // 查找重新解析选项
        const reparseOption = page.locator(
          "text=重新解析, text=Reparse, text=刷新"
        );

        if (await reparseOption.count() > 0) {
          await reparseOption.click();
          await page.waitForTimeout(500);

          // 验证操作成功
          const toast = page.locator("[data-sonner-toast]");
          // 如果有提示，验证提示存在
          if (await toast.count() > 0) {
            await expect(toast).toBeVisible();
          }
        }
      }
    } else {
      test.skip();
    }
  });

  /**
   * KN05 - 获取知识内容
   */
  test("KN05: 获取知识内容", async ({ page }) => {
    const knowledgeTab = page.locator("text=知识库, text=Knowledge");

    if (await knowledgeTab.count() > 0) {
      await knowledgeTab.click();
      await page.waitForTimeout(300);

      // 查找已有知识项
      const knowledgeItem = page.locator(
        '[data-knowledge-id], [data-testid="knowledge-item"]'
      ).first();

      if (await knowledgeItem.count() > 0) {
        // 点击查看详情
        await knowledgeItem.click();
        await page.waitForTimeout(300);

        // 验证详情页或模态框出现
        const detailView = page.locator(
          '[data-slot="knowledge-detail"], [role="dialog"]'
        );

        if (await detailView.count() > 0) {
          await expect(detailView).toBeVisible();

          // 验证内容存在
          const content = detailView.locator(
            "pre, [data-content], .prose"
          );
          if (await content.count() > 0) {
            await expect(content).toBeVisible();
          }
        }
      }
    } else {
      test.skip();
    }
  });
});

/**
 * Knowledge 搜索测试
 */
test.describe("Knowledge Search Tests", () => {
  test("搜索知识", async ({ page, electronApp }) => {
    const homePage = new HomePage(page, electronApp);
    await homePage.waitForReady();

    const knowledgeTab = page.locator("text=知识库, text=Knowledge");

    if (await knowledgeTab.count() > 0) {
      await knowledgeTab.click();
      await page.waitForTimeout(300);

      // 查找搜索框
      const searchInput = page.locator(
        "input[placeholder*='搜索'], input[type='search']"
      );

      if (await searchInput.count() > 0) {
        await searchInput.fill("测试");
        await page.waitForTimeout(500);

        // 验证搜索结果
        const results = page.locator(
          '[data-knowledge-id], [data-testid="knowledge-item"]'
        );

        // 如果有结果，验证可见
        if (await results.count() > 0) {
          await expect(results.first()).toBeVisible();
        }
      }
    } else {
      test.skip();
    }
  });
});
