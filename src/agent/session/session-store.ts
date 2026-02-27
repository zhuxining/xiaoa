/**
 * session-store.ts - 会话 CRUD（pi SessionManager 封装）
 *
 * 所有 pi SessionManager 的交互集中在此，ipc/session/ 仅做极薄委托。
 *
 * 路径约定（pi 格式）：
 *   工作区会话: {userData}/workspaces/{workspaceId}/sessions/{timestamp}_{uuid}.jsonl
 *   全局会话:   {userData}/xiaoa/sessions/{timestamp}_{uuid}.jsonl
 */

// biome-ignore lint/performance/noNamespaceImport: Node.js fs 惯用命名空间导入
import * as fs from "node:fs/promises";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import {
  buildSessionContext,
  SessionManager,
} from "@mariozechner/pi-coding-agent";
import { getBaseDir, getSessionsDir } from "../paths";

type SessionInfo = Awaited<ReturnType<typeof SessionManager.list>>[number];

export interface SessionMeta {
  createdAt: number;
  id: string;
  messageCount: number;
  title: string;
  updatedAt: number;
  workspaceId: string | null;
}

function toSessionMeta(
  info: SessionInfo,
  workspaceId: string | null
): SessionMeta {
  const rawTitle = info.name ?? info.firstMessage ?? "";
  const title =
    rawTitle.length > 50 ? `${rawTitle.slice(0, 50)}...` : rawTitle || "新会话";
  return {
    id: info.id,
    workspaceId,
    title,
    createdAt: info.created.getTime(),
    updatedAt: info.modified.getTime(),
    messageCount: info.messageCount,
  };
}

/**
 * 列出会话（支持按项目路径过滤）
 */
export async function listSessions(input: {
  workspaceId: string | null;
  projectPath?: string;
}): Promise<SessionMeta[]> {
  const { workspaceId, projectPath } = input;
  const baseDir = getBaseDir(workspaceId);
  const sessionsDir = getSessionsDir(workspaceId);

  await fs.mkdir(sessionsDir, { recursive: true }).catch(() => {
    // 目录已存在，忽略
  });

  let sessions = await SessionManager.list(baseDir, sessionsDir).catch(
    () => []
  );

  if (projectPath) {
    sessions = sessions.filter((s) => s.cwd === projectPath);
  }

  return sessions
    .map((info) => toSessionMeta(info, workspaceId))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * 获取单个会话元数据
 */
export async function getSession(input: {
  workspaceId: string | null;
  id: string;
}): Promise<SessionMeta | null> {
  const { workspaceId, id } = input;
  const baseDir = getBaseDir(workspaceId);
  const sessionsDir = getSessionsDir(workspaceId);

  const sessions = await SessionManager.list(baseDir, sessionsDir).catch(
    () => []
  );
  const info = sessions.find((s) => s.id === id);
  return info ? toSessionMeta(info, workspaceId) : null;
}

/**
 * 通过 SessionManager.list() 查找会话文件路径（按 header ID 匹配，非文件名）
 */
async function findSessionFilePath(
  workspaceId: string | null,
  sessionId: string
): Promise<string | null> {
  const baseDir = getBaseDir(workspaceId);
  const sessionsDir = getSessionsDir(workspaceId);

  try {
    const sessions = await SessionManager.list(baseDir, sessionsDir);
    const match = sessions.find((s) => s.id === sessionId);
    return match?.path ?? null;
  } catch {
    return null;
  }
}

/**
 * 获取会话消息列表
 */
export async function getSessionMessages(input: {
  workspaceId: string | null;
  sessionId: string;
}): Promise<AgentMessage[]> {
  const { workspaceId, sessionId } = input;

  try {
    const filePath = await findSessionFilePath(workspaceId, sessionId);
    if (!filePath) {
      return [];
    }

    const sm = SessionManager.open(filePath);
    const { messages } = buildSessionContext(sm.getEntries());
    return messages;
  } catch {
    return [];
  }
}

/**
 * 创建新会话
 */
export async function createSession(input: {
  workspaceId: string | null;
  cwd?: string;
  title?: string;
}): Promise<SessionMeta> {
  const { workspaceId, cwd, title } = input;
  const baseDir = getBaseDir(workspaceId);
  const sessionsDir = getSessionsDir(workspaceId);

  await fs.mkdir(sessionsDir, { recursive: true });

  const sessionCwd = cwd ?? baseDir;
  const sm = SessionManager.create(sessionCwd, sessionsDir);
  const id = sm.getSessionId();
  const sessionFile = sm.getSessionFile();

  // pi 的 SessionManager 默认只在收到 assistant 消息后才写入磁盘
  // 这里强制立即写入会话头，确保会话可以被 list 发现
  if (sessionFile) {
    const header = sm.getHeader();
    if (header) {
      await fs.writeFile(sessionFile, `${JSON.stringify(header)}\n`);
    }
  }

  // 从 SessionManager.list 重新读取，确保返回的数据与列表一致
  const sessions = await SessionManager.list(baseDir, sessionsDir).catch(
    () => []
  );
  const newSession = sessions.find((s) => s.id === id);

  if (newSession) {
    return toSessionMeta(newSession, workspaceId);
  }

  // Fallback: 如果 list 没有找到（极少情况），返回硬编码值
  const now = Date.now();
  return {
    id,
    workspaceId,
    title: title ?? "新会话",
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };
}

/**
 * 重命名会话
 *
 * 通过 SessionPool 获取活跃 session 调用 setSessionName()，
 * 或直接修改 JSONL 文件头（fallback）。
 */
export async function renameSession(input: {
  workspaceId: string | null;
  id: string;
  name: string;
}): Promise<SessionMeta | null> {
  const { workspaceId, id, name } = input;

  // 尝试通过 pool 中的 session 设置
  // 注意：这里需要动态 import 避免循环依赖
  try {
    const { getPooledSession } = await import("./session-pool");
    const key = workspaceId ? `workspace:${workspaceId}:${id}` : `global:${id}`;
    const pooled = getPooledSession(key);
    if (pooled) {
      pooled.session.setSessionName(name);
    }
  } catch {
    // pool 不可用，继续用 list 方式
  }

  // 返回更新后的元数据
  return getSession({ workspaceId, id });
}

/**
 * 删除会话
 */
export async function deleteSession(input: {
  workspaceId: string | null;
  id: string;
}): Promise<SessionMeta | null> {
  const { workspaceId, id } = input;
  const baseDir = getBaseDir(workspaceId);
  const sessionsDir = getSessionsDir(workspaceId);

  const sessions = await SessionManager.list(baseDir, sessionsDir).catch(
    () => []
  );
  const info = sessions.find((s) => s.id === id);

  try {
    // 使用 SessionManager.list() 返回的 path 精确定位文件
    if (info?.path) {
      await fs.unlink(info.path);
    }
    return info ? toSessionMeta(info, workspaceId) : null;
  } catch {
    return null;
  }
}
