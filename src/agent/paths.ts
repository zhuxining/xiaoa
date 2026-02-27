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
 *
 * 通过 SessionManager.list() 按 header ID 精确匹配会话文件。
 * 找不到时返回新文件路径供 SessionManager.open() 创建。
 */
export async function getSessionFilePath(
  workspaceId: string | null,
  sessionId: string
): Promise<string> {
  const baseDir = getBaseDir(workspaceId);
  const sessionsDir = getSessionsDir(workspaceId);

  try {
    // 使用 pi 的 SessionManager.list() 按 header ID 精确查找
    const { SessionManager } = await import("@mariozechner/pi-coding-agent");
    const sessions = await SessionManager.list(baseDir, sessionsDir);
    const match = sessions.find((s) => s.id === sessionId);
    if (match) {
      return match.path;
    }
  } catch {
    // sessions 目录不存在或其他错误，继续返回新路径
  }

  // 找不到时返回新文件路径，使用 pi 命名规范
  return path.join(sessionsDir, `${Date.now()}_${sessionId}.jsonl`);
}
