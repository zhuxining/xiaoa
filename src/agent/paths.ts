/**
 * paths.ts - 工作区/全局路径约定
 *
 * 统一管理所有 pi 相关的磁盘路径计算，供 agent/ 内各模块共享。
 */

// biome-ignore lint/performance/noNamespaceImport: Node.js path 惯用命名空间导入
import * as path from "node:path";
import { app } from "electron";

/**
 * 获取工作区目录（作为 agentDir，用于 skills 自动加载）
 */
export function getWorkspaceDir(workspaceId: string): string {
  return path.join(app.getPath("userData"), "workspaces", workspaceId);
}

/**
 * 获取全局小A目录（作为全局 agentDir）
 */
export function getGlobalDir(): string {
  return path.join(app.getPath("userData"), "xiaoa");
}

/**
 * 获取基础目录（工作区或全局）
 */
export function getBaseDir(workspaceId: string | null): string {
  return workspaceId ? getWorkspaceDir(workspaceId) : getGlobalDir();
}

/**
 * 获取会话目录
 */
export function getSessionsDir(workspaceId: string | null): string {
  return path.join(getBaseDir(workspaceId), "sessions");
}

/**
 * 获取会话文件完整路径
 */
export function getSessionFilePath(
  workspaceId: string | null,
  sessionId: string
): string {
  return path.join(getSessionsDir(workspaceId), `${sessionId}.jsonl`);
}
