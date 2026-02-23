/**
 * session/handlers.ts - Session IPC Handlers
 *
 * 使用 pi SessionManager 管理会话，不再手动解析 JSONL。
 *
 * 路径约定（pi 格式）：
 *   工作区会话: {userData}/workspaces/{workspaceId}/sessions/{timestamp}_{uuid}.jsonl
 *   全局会话:   {userData}/xiaoa/sessions/{timestamp}_{uuid}.jsonl
 *
 * 项目过滤：pi 会话头中存储 cwd（项目路径），通过 SessionInfo.cwd 过滤。
 */

// biome-ignore lint/performance/noNamespaceImport: Node.js fs/path 惯用命名空间导入
import * as fs from "node:fs/promises";
// biome-ignore lint/performance/noNamespaceImport: Node.js fs/path 惯用命名空间导入
import * as path from "node:path";
import {
  buildSessionContext,
  SessionManager,
} from "@mariozechner/pi-coding-agent";
import { os } from "@orpc/server";
import { app } from "electron";
import {
  createSessionInputSchema,
  deleteSessionInputSchema,
  getSessionInputSchema,
  getSessionMessagesInputSchema,
  listSessionsInputSchema,
  type SessionMeta,
  sessionMetaSchema,
} from "./schemas";

function getBaseDir(workspaceId: string | null): string {
  const userData = app.getPath("userData");
  return workspaceId
    ? path.join(userData, "workspaces", workspaceId)
    : path.join(userData, "xiaoa");
}

function getSessionsDir(workspaceId: string | null): string {
  return path.join(getBaseDir(workspaceId), "sessions");
}

type SessionInfo = Awaited<ReturnType<typeof SessionManager.list>>[number];

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

export const sessionRouter = os.router({
  list: os
    .input(listSessionsInputSchema)
    .output(sessionMetaSchema.array())
    .handler(async ({ input }) => {
      const { workspaceId, projectPath } = input;
      const baseDir = getBaseDir(workspaceId);
      const sessionsDir = getSessionsDir(workspaceId);

      await fs.mkdir(sessionsDir, { recursive: true }).catch(() => {});

      let sessions = await SessionManager.list(baseDir, sessionsDir).catch(
        () => []
      );

      // 按项目路径过滤（pi 会话头中的 cwd 字段）
      if (projectPath) {
        sessions = sessions.filter((s) => s.cwd === projectPath);
      }

      return sessions
        .map((info) => toSessionMeta(info, workspaceId))
        .sort((a, b) => b.updatedAt - a.updatedAt);
    }),

  get: os
    .input(getSessionInputSchema)
    .output(sessionMetaSchema.nullable())
    .handler(async ({ input }) => {
      const { workspaceId, id } = input;
      const baseDir = getBaseDir(workspaceId);
      const sessionsDir = getSessionsDir(workspaceId);

      const sessions = await SessionManager.list(baseDir, sessionsDir).catch(
        () => []
      );
      const info = sessions.find((s) => s.id === id);
      return info ? toSessionMeta(info, workspaceId) : null;
    }),

  getMessages: os.input(getSessionMessagesInputSchema).handler(async ({ input }) => {
    const { workspaceId, sessionId } = input;
    const sessionsDir = getSessionsDir(workspaceId);

    // pi 的文件名格式是 {timestamp}_{uuid}.jsonl，需要查找匹配的文件
    try {
      const files = await fs.readdir(sessionsDir);
      const sessionFile = files.find((f) => f.endsWith(`_${sessionId}.jsonl`));

      if (!sessionFile) {
        return [];
      }

      const filePath = path.join(sessionsDir, sessionFile);
      const sm = SessionManager.open(filePath);
      const { messages } = buildSessionContext(sm.getEntries());
      return messages;
    } catch {
      return [];
    }
  }),

  create: os
    .input(createSessionInputSchema)
    .output(sessionMetaSchema)
    .handler(async ({ input }) => {
      const { workspaceId, cwd, title } = input;
      const baseDir = getBaseDir(workspaceId);
      const sessionsDir = getSessionsDir(workspaceId);

      await fs.mkdir(sessionsDir, { recursive: true });

      // cwd 优先取项目路径，回退为 baseDir（写入 pi 会话头，供 list 过滤使用）
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

      const now = Date.now();

      return {
        id,
        workspaceId,
        title: title ?? "新会话",
        createdAt: now,
        updatedAt: now,
        messageCount: 0,
      };
    }),

  delete: os
    .input(deleteSessionInputSchema)
    .output(sessionMetaSchema.nullable())
    .handler(async ({ input }) => {
      const { workspaceId, id } = input;
      const baseDir = getBaseDir(workspaceId);
      const sessionsDir = getSessionsDir(workspaceId);

      const sessions = await SessionManager.list(baseDir, sessionsDir).catch(
        () => []
      );
      const info = sessions.find((s) => s.id === id);

      // pi 的文件名格式是 {timestamp}_{uuid}.jsonl，需要查找匹配的文件
      try {
        const files = await fs.readdir(sessionsDir);
        const sessionFile = files.find((f) =>
          f.endsWith(`_${id}.jsonl`)
        );

        if (sessionFile) {
          const filePath = path.join(sessionsDir, sessionFile);
          await fs.unlink(filePath);
        }

        return info ? toSessionMeta(info, workspaceId) : null;
      } catch {
        return null;
      }
    }),
});
