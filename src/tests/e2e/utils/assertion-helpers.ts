import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * 断言辅助函数
 */

/**
 * 断言元素可见
 */
export async function assertVisible(
  page: Page,
  selector: string
): Promise<void> {
  await expect(page.locator(selector)).toBeVisible();
}

/**
 * 断言元素不可见
 */
export async function assertNotVisible(
  page: Page,
  selector: string
): Promise<void> {
  await expect(page.locator(selector)).not.toBeVisible();
}

/**
 * 断言元素存在
 */
export async function assertExists(
  page: Page,
  selector: string
): Promise<void> {
  await expect(page.locator(selector)).toBeAttached();
}

/**
 * 断言元素不存在
 */
export async function assertNotExists(
  page: Page,
  selector: string
): Promise<void> {
  await expect(page.locator(selector)).not.toBeAttached();
}

/**
 * 断言文本内容
 */
export async function assertText(
  page: Page,
  selector: string,
  text: string | RegExp
): Promise<void> {
  await expect(page.locator(selector)).toContainText(text);
}

/**
 * 断言文本完全匹配
 */
export async function assertTextEquals(
  page: Page,
  selector: string,
  text: string
): Promise<void> {
  await expect(page.locator(selector)).toHaveText(text);
}

/**
 * 断言输入值
 */
export async function assertInputValue(
  page: Page,
  selector: string,
  value: string
): Promise<void> {
  await expect(page.locator(selector)).toHaveValue(value);
}

/**
 * 断言元素数量
 */
export async function assertCount(
  page: Page,
  selector: string,
  count: number
): Promise<void> {
  await expect(page.locator(selector)).toHaveCount(count);
}

/**
 * 断言元素数量大于
 */
export async function assertCountGreaterThan(
  page: Page,
  selector: string,
  count: number
): Promise<void> {
  const actualCount = await page.locator(selector).count();
  expect(actualCount).toBeGreaterThan(count);
}

/**
 * 断言元素数量大于等于
 */
export async function assertCountGreaterThanOrEqual(
  page: Page,
  selector: string,
  count: number
): Promise<void> {
  const actualCount = await page.locator(selector).count();
  expect(actualCount).toBeGreaterThanOrEqual(count);
}

/**
 * 断言 URL
 */
export async function assertUrl(
  page: Page,
  urlPattern: string | RegExp
): Promise<void> {
  await expect(page).toHaveURL(urlPattern);
}

/**
 * 断言标题
 */
export async function assertTitle(
  page: Page,
  title: string | RegExp
): Promise<void> {
  await expect(page).toHaveTitle(title);
}

/**
 * 断言元素启用
 */
export async function assertEnabled(
  page: Page,
  selector: string
): Promise<void> {
  await expect(page.locator(selector)).toBeEnabled();
}

/**
 * 断言元素禁用
 */
export async function assertDisabled(
  page: Page,
  selector: string
): Promise<void> {
  await expect(page.locator(selector)).toBeDisabled();
}

/**
 * 断言复选框选中
 */
export async function assertChecked(
  page: Page,
  selector: string
): Promise<void> {
  await expect(page.locator(selector)).toBeChecked();
}

/**
 * 断言复选框未选中
 */
export async function assertNotChecked(
  page: Page,
  selector: string
): Promise<void> {
  await expect(page.locator(selector)).not.toBeChecked();
}

/**
 * 断言元素聚焦
 */
export async function assertFocused(
  page: Page,
  selector: string
): Promise<void> {
  await expect(page.locator(selector)).toBeFocused();
}

/**
 * 断言元素属性
 */
export async function assertAttribute(
  page: Page,
  selector: string,
  name: string,
  value: string | RegExp
): Promise<void> {
  await expect(page.locator(selector)).toHaveAttribute(name, value);
}

/**
 * 断言 CSS 类
 */
export async function assertClass(
  page: Page,
  selector: string,
  className: string
): Promise<void> {
  await expect(page.locator(selector)).toHaveClass(new RegExp(className));
}

/**
 * 断言 Locator
 */
export async function assertLocator(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
}

/**
 * 断言 Toast 消息
 */
export async function assertToast(
  page: Page,
  message: string | RegExp,
  type?: "success" | "error"
): Promise<void> {
  const toastSelector = type
    ? `[data-sonner-toast][data-type="${type}"]`
    : "[data-sonner-toast]";
  await expect(page.locator(toastSelector)).toContainText(message);
}

/**
 * 断言无错误
 */
export async function assertNoErrors(page: Page): Promise<void> {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  expect(errors).toHaveLength(0);
}
