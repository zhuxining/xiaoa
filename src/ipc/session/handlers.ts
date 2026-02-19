/**
 * session/handlers.ts - Session IPC Handlers
 *
 * 基于 pi SessionManager JSONL 格式的会话管理。
 * 直接读取 ~/.xiaoa/agent/sessions/ 目录。
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { os } from "@orpc/server";
import {
  createSessionInputSchema,
  deleteSessionInputSchema,
  getSessionInputSchema,
  getSessionMessagesInputSchema,
  listSessionsInputSchema,
  type SessionMeta,
  sessionMetaSchema,
} from "./schemas";

/**
 * 获取 xiaoa agent 目录
 */
function getXiaoaAgentDir(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  return path.join(home, ".xiaoa", "agent");
}

/**
 * 获取会话存储目录
 *
 * 格式: ~/.xiaoa/agent/sessions/<encoded-cwd>/
 */
function getSessionsDir(scope: string, workspaceId?: string): string {
  const agentDir = getXiaoaAgentDir();
  if (scope === "global") {
    return path.join(agentDir, "sessions", "global");
  }
  // workspace 会话使用 workspaceId 作为目录名
  const encodedId = workspaceId?.replace(/[/\\]/g, "_") ?? "unknown";
  return path.join(agentDir, "sessions", `workspace-${encodedId}`);
}

/**
 * 解析 JSONL 文件内容
 */
async function parseJsonlFile(
  filePath: string
): Promise<Record<string, unknown>[]> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.trim().split("\n");
    return lines.filter((line) => line.trim()).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

/**
 * 从 JSONL 文件重建 AgentMessage[]
 */
async function rebuildMessages(filePath: string): Promise<AgentMessage[]> {
  const entries = await parseJsonlFile(filePath);
  const messages: AgentMessage[] = [];

  for (const entry of entries) {
    // 跳过 compaction 标记
    if (entry.type === "compaction") {
      continue;
    }

    const role = entry.role as string;
    const timestamp = (entry.timestamp as number) ?? Date.now();

    // 处理消息条目
    if (role === "user" && typeof entry.content === "string") {
      messages.push({
        role: "user",
        content: entry.content,
        timestamp,
      });
    } else if (role === "assistant") {
      // assistant 消息可能有复杂格式
      const content = Array.isArray(entry.content)
        ? entry.content
        : [{ type: "text" as const, text: String(entry.content ?? "") }];

      messages.push({
        role: "assistant",
        content,
        timestamp,
        api: (entry.api as string) ?? "unknown",
        provider: (entry.provider as string) ?? "unknown",
        model: (entry.model as string) ?? "unknown",
        usage: (entry.usage as any) ?? {
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 0,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        },
        stopReason:
          (entry.stopReason as
            | "stop"
            | "length"
            | "toolUse"
            | "error"
            | "aborted") ?? "stop",
      });
    } else if (role === "toolResult") {
      const content = Array.isArray(entry.content)
        ? entry.content
        : [{ type: "text" as const, text: String(entry.content ?? "") }];

      messages.push({
        role: "toolResult",
        toolCallId: (entry.toolCallId as string) ?? "",
        toolName: (entry.toolName as string) ?? "unknown",
        content,
        isError: Boolean(entry.isError),
        timestamp,
      });
    }
  }

  return messages;
}

/**
 * 从首条用户消息提取标题
 */
function extractTitle(messages: AgentMessage[]): string {
  for (const msg of messages) {
    if (msg.role === "user" && typeof msg.content === "string") {
      const title = msg.content.slice(0, 50);
      return title.length < msg.content.length ? `${title}...` : title;
    }
  }
  return "新会话";
}

/**
 * Session Router
 */
export const sessionRouter = os.router({
  /**
   * 列出会话
   */
  list: os
    .input(listSessionsInputSchema)
    .output(sessionMetaSchema.array())
    .handler(async ({ input }) => {
      const { scope, workspaceId } = input;
      const sessionsDir = getSessionsDir(scope, workspaceId);

      try {
        await fs.mkdir(sessionsDir, { recursive: true });
        const files = await fs.readdir(sessionsDir);
        const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

        const sessions: SessionMeta[] = [];

        for (const file of jsonlFiles) {
          const filePath = path.join(sessionsDir, file);
          const stat = await fs.stat(filePath);
          const id = file.replace(/\.jsonl$/, "");

          // 解析消息获取标题和数量
          const messages = await rebuildMessages(filePath);
          const title = extractTitle(messages);

          sessions.push({
            id,
            scope,
            workspaceId: workspaceId ?? null,
            title,
            createdAt: stat.birthtimeMs,
            updatedAt: stat.mtimeMs,
            messageCount: messages.length,
          });
        }

        // 按更新时间降序排序
        sessions.sort((a, b) => b.updatedAt - a.updatedAt);
        return sessions;
      } catch {
        return [];
      }
    }),

  /**
   * 获取单个会话
   */
  get: os
    .input(getSessionInputSchema)
    .output(sessionMetaSchema.nullable())
    .handler(async ({ input }) => {
      const { scope, workspaceId, id } = input;
      const sessionsDir = getSessionsDir(scope, workspaceId);
      const filePath = path.join(sessionsDir, `${id}.jsonl`);

      try {
        const stat = await fs.stat(filePath);
        const messages = await rebuildMessages(filePath);
        const title = extractTitle(messages);

        return {
          id,
          scope,
          workspaceId: workspaceId ?? null,
          title,
          createdAt: stat.birthtimeMs,
          updatedAt: stat.mtimeMs,
          messageCount: messages.length,
        };
      } catch {
        return null;
      }
    }),

  /**
   * 获取会话消息
   */
  getMessages: os
    .input(getSessionMessagesInputSchema)
    .handler(async ({ input }) => {
      const { scope, workspaceId, sessionId } = input;
      const sessionsDir = getSessionsDir(scope, workspaceId);
      const filePath = path.join(sessionsDir, `${sessionId}.jsonl`);

      try {
        return await rebuildMessages(filePath);
      } catch {
        return [];
      }
    }),

  /**
   * 创建会话
   *
   * 创建空的 JSONL 文件
   */
  create: os
    .input(createSessionInputSchema)
    .output(sessionMetaSchema)
    .handler(async ({ input }) => {
      const { scope, workspaceId, title } = input;
      const sessionsDir = getSessionsDir(scope, workspaceId);

      await fs.mkdir(sessionsDir, { recursive: true });

      // 生成会话 ID
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const filePath = path.join(sessionsDir, `${id}.jsonl`);

      // 创建空文件
      await fs.writeFile(filePath, "", "utf-8");

      const now = Date.now();
      return {
        id,
        scope,
        workspaceId: workspaceId ?? null,
        title: title ?? "新会话",
        createdAt: now,
        updatedAt: now,
        messageCount: 0,
      };
    }),

  /**
   * 删除会话
   */
  delete: os
    .input(deleteSessionInputSchema)
    .output(sessionMetaSchema.nullable())
    .handler(async ({ input }) => {
      const { scope, workspaceId, id } = input;
      const sessionsDir = getSessionsDir(scope, workspaceId);
      const filePath = path.join(sessionsDir, `${id}.jsonl`);

      try {
        const stat = await fs.stat(filePath);
        const messages = await rebuildMessages(filePath);

        // 删除文件
        await fs.unlink(filePath);

        return {
          id,
          scope,
          workspaceId: workspaceId ?? null,
          title: extractTitle(messages),
          createdAt: stat.birthtimeMs,
          updatedAt: stat.mtimeMs,
          messageCount: messages.length,
        };
      } catch {
        return null;
      }
    }),
});
