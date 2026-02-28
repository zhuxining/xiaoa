/**
 * 文件系统辅助函数
 *
 * 提供测试用的文件系统操作，支持临时目录管理。
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let tempDirs: string[] = [];

/**
 * 创建临时目录
 *
 * @param prefix 目录前缀
 * @returns 临时目录路径
 */
export function createTempDir(prefix = "xiaoa-test"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const tempPath = join(tmpdir(), `${prefix}-${timestamp}-${random}`);

  mkdirSync(tempPath, { recursive: true });
  tempDirs.push(tempPath);

  return tempPath;
}

/**
 * 清理临时目录
 *
 * @param dirPath 目录路径
 */
export function cleanupTempDir(dirPath: string): void {
  if (existsSync(dirPath)) {
    rmSync(dirPath, { recursive: true, force: true });
  }
  tempDirs = tempDirs.filter((dir) => dir !== dirPath);
}

/**
 * 清理所有临时目录
 */
export function cleanupAllTempDirs(): void {
  for (const dir of tempDirs) {
    try {
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
      }
    } catch {
      // 忽略清理错误
    }
  }
  tempDirs = [];
}

/**
 * 在临时目录中创建文件
 *
 * @param dirPath 目录路径
 * @param relativePath 相对路径
 * @param content 文件内容
 */
export function createTempFile(
  dirPath: string,
  relativePath: string,
  content: string
): string {
  const filePath = join(dirPath, relativePath);
  const dir = filePath.substring(0, filePath.lastIndexOf("/"));

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(filePath, content, "utf-8");
  return filePath;
}

/**
 * 读取临时文件内容
 *
 * @param filePath 文件路径
 * @returns 文件内容
 */
export function readTempFile(filePath: string): string {
  return readFileSync(filePath, "utf-8");
}

/**
 * 创建模拟的工作区目录结构
 *
 * @param basePath 基础路径
 * @returns 工作区路径
 */
export function createMockWorkspaceStructure(basePath: string): {
  workspacePath: string;
  files: Record<string, string>;
} {
  const workspacePath = join(basePath, "workspace");
  mkdirSync(workspacePath, { recursive: true });

  const files: Record<string, string> = {
    "README.md": "# Test Workspace\n\nThis is a test workspace.",
    "package.json": JSON.stringify(
      {
        name: "test-workspace",
        version: "1.0.0",
      },
      null,
      2
    ),
    "src/index.ts": "export const hello = 'world';",
  };

  for (const [relativePath, content] of Object.entries(files)) {
    createTempFile(workspacePath, relativePath, content);
  }

  return { workspacePath, files };
}

/**
 * 创建模拟的 xiaoa 数据目录结构
 *
 * @param basePath 基础路径
 * @returns 数据目录路径
 */
export function createMockXiaoaDataDir(basePath: string): string {
  const dataPath = join(basePath, "xiaoa-data");
  mkdirSync(dataPath, { recursive: true });

  // 创建子目录
  mkdirSync(join(dataPath, "sessions"), { recursive: true });
  mkdirSync(join(dataPath, "workspaces"), { recursive: true });
  mkdirSync(join(dataPath, "skills"), { recursive: true });
  mkdirSync(join(dataPath, "knowledge"), { recursive: true });

  return dataPath;
}

/**
 * 等待文件存在
 *
 * @param filePath 文件路径
 * @param timeout 超时时间（毫秒）
 */
export async function waitForFile(
  filePath: string,
  timeout = 5000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (existsSync(filePath)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
}

/**
 * 等待条件满足
 *
 * @param condition 条件函数
 * @param timeout 超时时间（毫秒）
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout = 5000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
}
