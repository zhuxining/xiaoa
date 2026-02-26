/**
 * 测试工具函数
 *
 * 提供通用的测试辅助函数，如 waitFor、createTempDir 等。
 */

import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * 异步等待条件满足
 *
 * @param check - 检查函数，返回 true 表示条件满足
 * @param timeoutMs - 超时时间（毫秒）
 * @param intervalMs - 检查间隔（毫秒）
 */
export async function waitFor(
  check: () => boolean,
  timeoutMs = 3000,
  intervalMs = 30
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (check()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`waitFor timeout after ${timeoutMs}ms`);
}

/**
 * 创建临时目录
 *
 * @param prefix - 目录名前缀
 * @returns 临时目录路径
 */
export function createTempDir(prefix = "xiaoa-test-"): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

/**
 * 清理临时目录
 *
 * @param dirPath - 目录路径
 */
export function cleanupTempDir(dirPath: string): void {
  if (dirPath && existsSync(dirPath)) {
    rmSync(dirPath, { recursive: true, force: true });
  }
}

/**
 * 延迟执行
 *
 * @param ms - 延迟时间（毫秒）
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 重置模块缓存并重新导入
 *
 * @param modulePath - 模块路径
 */
export async function resetAndImport<T>(modulePath: string): Promise<T> {
  // 清除模块缓存
  const fullPath = require.resolve(modulePath);
  delete require.cache[fullPath];
  // 重新导入
  return import(modulePath);
}
