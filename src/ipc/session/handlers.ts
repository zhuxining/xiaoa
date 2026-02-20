/**
 * session/handlers.ts - Session IPC Handlers
 *
 * 基于 pi SessionManager JSONL 格式的会话管理。
 * 直接读取 ~/.xiaoa/agent/sessions/ 目录。
 */

// biome-ignore lint/performance/noNamespaceImport: Node.js fs/path 惯用命名空间导入
import * as fs from "node:fs/promises";
// biome-ignore lint/performance/noNamespaceImport: Node.js fs/path 惯用命名空间导入
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

const _JSONL_EXT_RE = /\.jsonl$/;

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

function toContentArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  return [{ type: "text" as const, text: String(raw ?? "") }];
}

function buildAssistantMessage(
  entry: Record<string, unknown>,
  timestamp: number
): AgentMessage {
  return {
    role: "assistant",
    content: toContentArray(entry.content) as unknown as Extract<
      AgentMessage,
      { role: "assistant" }
    >["content"],
    timestamp,
    api: (entry.api as string) ?? "unknown",
    provider: (entry.provider as string) ?? "unknown",
    model: (entry.model as string) ?? "unknown",
    // biome-ignore lint/suspicious/noExplicitAny: usage 从 JSONL 解析，类型不确定
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
  };
}

function buildToolResultMessage(
  entry: Record<string, unknown>,
  timestamp: number
): AgentMessage {
  return {
    role: "toolResult",
    toolCallId: (entry.toolCallId as string) ?? "",
    toolName: (entry.toolName as string) ?? "unknown",
    content: toContentArray(entry.content) as unknown as Extract<
      AgentMessage,
      { role: "toolResult" }
    >["content"],
    isError: Boolean(entry.isError),
    timestamp,
  };
}

/**
 * 从 JSONL 文件重建 AgentMessage[]
 */
async function rebuildMessages(filePath: string): Promise<AgentMessage[]> {
  const entries = await parseJsonlFile(filePath);
  const messages: AgentMessage[] = [];

  for (const entry of entries) {
    if (entry.type === "compaction") {
      continue;
    }

    const role = entry.role as string;
    const timestamp = (entry.timestamp as number) ?? Date.now();

    if (role === "user" && typeof entry.content === "string") {
      messages.push({ role: "user", content: entry.content, timestamp });
    } else if (role === "assistant") {
      messages.push(buildAssistantMessage(entry, timestamp));
    } else if (role === "toolResult") {
      messages.push(buildToolResultMessage(entry, timestamp));
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
          const id = file.replace(_JSONL_EXT_RE, "");

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
