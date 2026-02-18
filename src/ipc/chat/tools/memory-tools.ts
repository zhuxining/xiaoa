import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { Type } from "@sinclair/typebox";
import { app } from "electron";
import { getMemory } from "@/ipc/memory/store";
import type { ToolContext } from "../run/run-types";

function getWorkspaceDailyDir(workspaceId: string): string {
  return join(
    app.getPath("userData"),
    "workspaces",
    workspaceId,
    "memories",
    "daily"
  );
}

function getDailyLogPath(workspaceId: string, date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return join(getWorkspaceDailyDir(workspaceId), `${yyyy}-${mm}-${dd}.md`);
}

export function appendDailyLog(
  workspaceId: string,
  title: string,
  content: string
): void {
  const dir = getWorkspaceDailyDir(workspaceId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const now = new Date();
  const logPath = getDailyLogPath(workspaceId, now);
  const section = `\n## ${title} (${now.toISOString()})\n\n${content.trim()}\n`;
  appendFileSync(logPath, section, "utf-8");
}

export function searchDailyLogs(
  workspaceId: string,
  query: string,
  limit = 5
): Array<{ file: string; snippet: string }> {
  const dir = getWorkspaceDailyDir(workspaceId);
  if (!existsSync(dir)) {
    return [];
  }

  const lowerQuery = query.toLowerCase();
  const items: Array<{ file: string; snippet: string; score: number }> = [];

  for (const file of readdirSync(dir).filter((name) => name.endsWith(".md"))) {
    const content = readFileSync(join(dir, file), "utf-8");
    const idx = content.toLowerCase().indexOf(lowerQuery);
    if (idx < 0) {
      continue;
    }

    const start = Math.max(0, idx - 50);
    const end = Math.min(content.length, idx + query.length + 120);
    items.push({
      file,
      snippet: content.slice(start, end).replace(/\s+/g, " "),
      score: Math.max(1, 1000 - idx),
    });
  }

  items.sort((a, b) => b.score - a.score);
  return items.slice(0, limit).map(({ file, snippet }) => ({ file, snippet }));
}

export function memorySearch(
  workspaceId: string,
  query: string,
  limit = 5
): string {
  const memory = getMemory(workspaceId).content;
  const idx = memory.toLowerCase().indexOf(query.toLowerCase());
  const memoryHit =
    idx >= 0
      ? `MEMORY.md: ${memory
          .slice(Math.max(0, idx - 40), idx + query.length + 100)
          .replace(/\s+/g, " ")}`
      : null;

  const daily = searchDailyLogs(workspaceId, query, limit).map(
    ({ file, snippet }) => `${file}: ${snippet}`
  );

  const all = [...(memoryHit ? [memoryHit] : []), ...daily];
  return all.length > 0 ? all.slice(0, limit).join("\n") : "未找到相关记忆。";
}

export function memoryWrite(workspaceId: string, content: string): string {
  appendDailyLog(workspaceId, "Agent 记忆写入", content);
  return "已写入当日记忆日志。";
}

export function createMemoryTools(context: ToolContext): AgentTool[] {
  return [
    {
      name: "memory_search",
      label: "Memory Search",
      description: "从长期记忆和日记中搜索信息",
      parameters: Type.Object({
        query: Type.String({ description: "搜索关键词" }),
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 20 })),
      }),
      execute: (_toolCallId, rawParams) => {
        const params = rawParams as { query: string; limit?: number };
        if (!context.run.workspaceId) {
          throw new Error("global 会话不支持 memory_search");
        }
        const text = memorySearch(
          context.run.workspaceId,
          params.query,
          params.limit ?? 5
        );
        return Promise.resolve({
          content: [{ type: "text" as const, text }],
          details: { query: params.query },
        });
      },
    },
    {
      name: "memory_write",
      label: "Memory Write",
      description: "向 Daily Log 写入记忆",
      parameters: Type.Object({
        content: Type.String({ description: "要写入的记忆内容" }),
      }),
      execute: (_toolCallId, rawParams) => {
        const params = rawParams as { content: string };
        if (!context.run.workspaceId) {
          throw new Error("global 会话不支持 memory_write");
        }
        const text = memoryWrite(context.run.workspaceId, params.content);
        return Promise.resolve({
          content: [{ type: "text" as const, text }],
          details: {},
        });
      },
    },
  ];
}
