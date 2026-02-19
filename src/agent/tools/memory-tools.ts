/**
 * memory-tools.ts - 记忆工具
 *
 * 记忆管理工具：
 * - memory_search: 搜索 MEMORY.md + Daily Log
 * - memory_write: 追加 Daily Log
 */

import { appendFile, mkdir, readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { AgentTool, AgentToolResult } from "@mariozechner/pi-agent-core";
import { Type } from "@sinclair/typebox";

/** 换行符正则表达式 */
const NEWLINE_REGEX = /\n/;

/**
 * 记忆搜索工具参数 Schema
 */
const memorySearchSchema = Type.Object({
  query: Type.String({
    description: "搜索查询词",
  }),
  limit: Type.Optional(
    Type.Number({
      description: "返回结果数量限制，默认 5",
    })
  ),
});

/**
 * 记忆写入工具参数 Schema
 */
const memoryWriteSchema = Type.Object({
  content: Type.String({
    description: "要记录的内容",
  }),
  tags: Type.Optional(
    Type.Array(Type.String(), {
      description: "标签",
    })
  ),
});

/**
 * 获取 xiaoa agent 目录
 */
function getXiaoaAgentDir(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  return join(home, ".xiaoa", "agent");
}

/**
 * 获取 MEMORY.md 路径
 */
function getMemoryPath(): string {
  return join(getXiaoaAgentDir(), "MEMORY.md");
}

/**
 * 获取 Daily Log 目录
 */
function getDailyLogDir(): string {
  return join(getXiaoaAgentDir(), "logs");
}

/**
 * 获取今日日志文件路径
 */
function getTodayLogPath(): string {
  const today = new Date().toISOString().slice(0, 10);
  return join(getDailyLogDir(), `${today}.md`);
}

/**
 * 确保目录存在
 */
async function ensureDir(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch {
    // ignore
  }
}

/**
 * 搜索文件中匹配的行
 */
function searchInContent(
  content: string,
  queryLower: string,
  maxMatches: number
): string[] {
  const lines = content.split(NEWLINE_REGEX);
  const matches: string[] = [];

  for (const line of lines) {
    if (line.toLowerCase().includes(queryLower)) {
      matches.push(line.trim());
      if (matches.length >= maxMatches) {
        break;
      }
    }
  }

  return matches;
}

/**
 * 创建记忆搜索工具
 */
export function createMemorySearchTool(): AgentTool<typeof memorySearchSchema> {
  return {
    name: "memory_search",
    description: "搜索记忆库（MEMORY.md 和 Daily Log）",
    parameters: memorySearchSchema,
    label: "搜索记忆",
    async execute(
      _toolCallId: string,
      params: { query: string; limit?: number },
      _signal?: AbortSignal
    ): Promise<AgentToolResult<{ sources: string[] }>> {
      const { query, limit = 5 } = params;
      const results: { source: string; content: string }[] = [];
      const queryLower = query.toLowerCase();

      // 搜索 MEMORY.md
      try {
        const memoryPath = getMemoryPath();
        const content = await readFile(memoryPath, "utf-8");
        const matches = searchInContent(content, queryLower, limit);

        if (matches.length > 0) {
          results.push({
            source: "MEMORY.md",
            content: matches.join("\n"),
          });
        }
      } catch {
        // MEMORY.md 不存在
      }

      // 搜索 Daily Logs
      try {
        const logDir = getDailyLogDir();
        const files = await readdir(logDir);

        for (const file of files.slice(0, 7)) {
          // 最近 7 天
          if (!file.endsWith(".md")) {
            continue;
          }

          const filePath = join(logDir, file);
          const content = await readFile(filePath, "utf-8");
          const matches = searchInContent(content, queryLower, 3);

          if (matches.length > 0) {
            results.push({
              source: `logs/${file}`,
              content: matches.join("\n"),
            });
          }

          if (results.length >= limit) {
            break;
          }
        }
      } catch {
        // logs 目录不存在
      }

      if (results.length === 0) {
        return {
          content: [{ type: "text", text: `未找到与 "${query}" 相关的记忆` }],
          details: { sources: [] },
        };
      }

      const output = results
        .map((r) => `### ${r.source}\n${r.content}`)
        .join("\n\n");

      return {
        content: [{ type: "text", text: output }],
        details: { sources: results.map((r) => r.source) },
      };
    },
  };
}

/**
 * 创建记忆写入工具
 */
export function createMemoryWriteTool(): AgentTool<typeof memoryWriteSchema> {
  return {
    name: "memory_write",
    description: "追加内容到今日的 Daily Log",
    parameters: memoryWriteSchema,
    label: "记录日志",
    async execute(
      _toolCallId: string,
      params: { content: string; tags?: string[] },
      _signal?: AbortSignal
    ): Promise<AgentToolResult<{ file: string }>> {
      const { content, tags } = params;

      // 确保目录存在
      const logDir = getDailyLogDir();
      await ensureDir(logDir);

      // 格式化日志条目
      const timestamp = new Date().toLocaleTimeString("zh-CN");
      const tagStr = tags?.length ? ` [${tags.join(", ")}]` : "";
      const entry = `\n## ${timestamp}${tagStr}\n\n${content}\n`;

      // 追加到今日日志
      const logPath = getTodayLogPath();
      await appendFile(logPath, entry, "utf-8");

      return {
        content: [{ type: "text", text: `已记录到 ${basename(logPath)}` }],
        details: { file: logPath },
      };
    },
  };
}

/**
 * 追加 Daily Log（供其他模块使用）
 */
export async function appendDailyLog(
  content: string,
  tags?: string[]
): Promise<string> {
  const logDir = getDailyLogDir();
  await ensureDir(logDir);

  const timestamp = new Date().toLocaleTimeString("zh-CN");
  const tagStr = tags?.length ? ` [${tags.join(", ")}]` : "";
  const entry = `\n## ${timestamp}${tagStr}\n\n${content}\n`;

  const logPath = getTodayLogPath();
  await appendFile(logPath, entry, "utf-8");

  return logPath;
}
