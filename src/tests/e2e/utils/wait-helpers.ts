import type { Page } from "@playwright/test";

/**
 * 等待辅助函数
 */

/**
 * 等待元素出现
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout = 10000
): Promise<void> {
  await page.waitForSelector(selector, { timeout });
}

/**
 * 等待元素消失
 */
export async function waitForElementHidden(
  page: Page,
  selector: string,
  timeout = 10000
): Promise<void> {
  await page.waitForSelector(selector, { state: "hidden", timeout });
}

/**
 * 等待元素可见
 */
export async function waitForVisible(
  page: Page,
  selector: string,
  timeout = 10000
): Promise<void> {
  await page.waitForSelector(selector, { state: "visible", timeout });
}

/**
 * 等待 URL 变化
 */
export async function waitForUrl(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 10000
): Promise<void> {
  await page.waitForURL(urlPattern, { timeout });
}

/**
 * 等待请求完成
 */
export async function waitForRequest(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 30000
): Promise<void> {
  await page.waitForRequest(urlPattern, { timeout });
}

/**
 * 等待响应
 */
export async function waitForResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 30000
): Promise<void> {
  await page.waitForResponse(urlPattern, { timeout });
}

/**
 * 等待条件满足
 */
export async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout = 10000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * 等待动画完成
 */
export async function waitForAnimation(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<void> {
  await page.waitForFunction(
    (sel) => {
      const element = document.querySelector(sel);
      if (!element) return false;
      const animations = element.getAnimations();
      return animations.every((anim) => anim.playState === "finished");
    },
    selector,
    { timeout }
  );
}

/**
 * 等待 React 渲染完成
 */
export async function waitForReactRender(
  page: Page,
  timeout = 5000
): Promise<void> {
  await page.waitForFunction(
    () => {
      // 检查是否有 React 正在渲染的标志
      const root = document.querySelector("#root");
      if (!root) return true;
      return !root.hasAttribute("data-reactroot");
    },
    {},
    { timeout }
  );
}

/**
 * 轮询等待
 */
export async function pollUntil<T>(
  fn: () => Promise<T | null>,
  options: {
    interval?: number;
    timeout?: number;
  } = {}
): Promise<T> {
  const { interval = 100, timeout = 10000 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await fn();
    if (result !== null) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Polling timed out after ${timeout}ms`);
}
