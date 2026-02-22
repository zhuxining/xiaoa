/**
 * memory-tools.ts - 记忆工具
 *
 * 实现 ToolDefinition 接口，供 createAgentSession customTools 使用：
 * - memory_search: 搜索 MEMORY.md + Daily Log
 * - memory_write: 追加 Daily Log
 */

import { appendFile, mkdir, readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type {
  AgentToolResult,
  ToolDefinition,
} from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

const memorySearchSchema = Type.Object({
  query: Type.String({ description: "搜索查询词" }),
  limit: Type.Optional(
    Type.Number({ description: "返回结果数量限制，默认 5" })
  ),
});

const memoryWriteSchema = Type.Object({
  content: Type.String({ description: "要记录的内容" }),
  tags: Type.Optional(Type.Array(Type.String(), { description: "标签" })),
});

function getAgentDir(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  return join(home, ".pi", "agent");
}

function getMemoryPath(): string {
  return join(getAgentDir(), "MEMORY.md");
}

function getDailyLogDir(): string {
  return join(getAgentDir(), "logs");
}

function getTodayLogPath(): string {
  const today = new Date().toISOString().slice(0, 10);
  return join(getDailyLogDir(), `${today}.md`);
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true }).catch(() => {
    /* ignore */
  });
}

function searchInContent(
  content: string,
  queryLower: string,
  max: number
): string[] {
  const matches: string[] = [];
  for (const line of content.split("\n")) {
    if (line.toLowerCase().includes(queryLower)) {
      matches.push(line.trim());
      if (matches.length >= max) {
        break;
      }
    }
  }
  return matches;
}

export const memorySearchTool: ToolDefinition<typeof memorySearchSchema> = {
  name: "memory_search",
  label: "搜索记忆",
  description: "搜索记忆库（MEMORY.md 和 Daily Log）",
  parameters: memorySearchSchema,
  async execute(
    _toolCallId,
    params,
    _signal,
    _onUpdate,
    _ctx
  ): Promise<AgentToolResult<{ sources: string[] }>> {
    const { query, limit = 5 } = params;
    const results: { source: string; content: string }[] = [];
    const queryLower = query.toLowerCase();

    try {
      const content = await readFile(getMemoryPath(), "utf-8");
      const matches = searchInContent(content, queryLower, limit);
      if (matches.length > 0) {
        results.push({ source: "MEMORY.md", content: matches.join("\n") });
      }
    } catch {
      // MEMORY.md 不存在
    }

    try {
      const files = await readdir(getDailyLogDir());
      for (const file of files.slice(0, 7)) {
        if (!file.endsWith(".md")) {
          continue;
        }
        const content = await readFile(join(getDailyLogDir(), file), "utf-8");
        const matches = searchInContent(content, queryLower, 3);
        if (matches.length > 0) {
          results.push({ source: `logs/${file}`, content: matches.join("\n") });
        }
        if (results.length >= limit) {
          break;
        }
      }
    } catch {
      // logs 目录不存在
    }

    const text =
      results.length === 0
        ? `未找到与 "${query}" 相关的记忆`
        : results.map((r) => `### ${r.source}\n${r.content}`).join("\n\n");

    return {
      content: [{ type: "text", text }],
      details: { sources: results.map((r) => r.source) },
    };
  },
};

export const memoryWriteTool: ToolDefinition<typeof memoryWriteSchema> = {
  name: "memory_write",
  label: "记录日志",
  description: "追加内容到今日的 Daily Log",
  parameters: memoryWriteSchema,
  async execute(
    _toolCallId,
    params,
    _signal,
    _onUpdate,
    _ctx
  ): Promise<AgentToolResult<{ file: string }>> {
    const { content, tags } = params;
    await ensureDir(getDailyLogDir());

    const timestamp = new Date().toLocaleTimeString("zh-CN");
    const tagStr = tags?.length ? ` [${tags.join(", ")}]` : "";
    const entry = `\n## ${timestamp}${tagStr}\n\n${content}\n`;

    const logPath = getTodayLogPath();
    await appendFile(logPath, entry, "utf-8");

    return {
      content: [{ type: "text", text: `已记录到 ${basename(logPath)}` }],
      details: { file: logPath },
    };
  },
};

/**
 * 追加 Daily Log（供其他模块直接调用）
 */
export async function appendDailyLog(
  content: string,
  tags?: string[]
): Promise<string> {
  await ensureDir(getDailyLogDir());
  const timestamp = new Date().toLocaleTimeString("zh-CN");
  const tagStr = tags?.length ? ` [${tags.join(", ")}]` : "";
  const entry = `\n## ${timestamp}${tagStr}\n\n${content}\n`;
  const logPath = getTodayLogPath();
  await appendFile(logPath, entry, "utf-8");
  return logPath;
}
