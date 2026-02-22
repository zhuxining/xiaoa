/**
 * knowledge-tools.ts - 知识库工具
 *
 * 实现 ToolDefinition 接口，供 createAgentSession customTools 使用：
 * - knowledge_read: 读取知识条目
 * - knowledge_list: 列出知识条目
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  AgentToolResult,
  ToolDefinition,
} from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

const knowledgeReadSchema = Type.Object({
  id: Type.String({ description: "知识条目 ID（文件名，不含 .md 后缀）" }),
});

const knowledgeListSchema = Type.Object({});

const MD_EXTENSION_REGEX = /\.md$/;

function getKnowledgeDir(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  return join(home, ".pi", "agent", "knowledge");
}

function extractTitle(content: string, fallbackId: string): string {
  const lines = content.split("\n");
  if (lines[0] === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === "---") {
        break;
      }
      if (lines[i].startsWith("title:")) {
        return lines[i].slice(6).trim();
      }
    }
  } else if (lines[0]?.startsWith("# ")) {
    return lines[0].slice(2).trim();
  }
  return fallbackId;
}

export const knowledgeReadTool: ToolDefinition<typeof knowledgeReadSchema> = {
  name: "knowledge_read",
  label: "读取知识",
  description: "读取知识库中的条目",
  parameters: knowledgeReadSchema,
  async execute(
    _toolCallId,
    params,
    _signal,
    _onUpdate,
    _ctx
  ): Promise<AgentToolResult<undefined>> {
    const { id } = params;

    if (id.includes("..") || id.includes("/") || id.includes("\\")) {
      return {
        content: [{ type: "text", text: "无效的知识条目 ID" }],
        details: undefined,
      };
    }

    try {
      const content = await readFile(
        join(getKnowledgeDir(), `${id}.md`),
        "utf-8"
      );
      return { content: [{ type: "text", text: content }], details: undefined };
    } catch {
      return {
        content: [{ type: "text", text: `知识条目 "${id}" 不存在` }],
        details: undefined,
      };
    }
  },
};

export const knowledgeListTool: ToolDefinition<typeof knowledgeListSchema> = {
  name: "knowledge_list",
  label: "列出知识",
  description: "列出知识库中的所有条目",
  parameters: knowledgeListSchema,
  async execute(
    _toolCallId,
    _params,
    _signal,
    _onUpdate,
    _ctx
  ): Promise<AgentToolResult<{ count: number }>> {
    const knowledgeDir = getKnowledgeDir();

    try {
      const files = (await readdir(knowledgeDir)).filter((f) =>
        f.endsWith(".md")
      );

      if (files.length === 0) {
        return {
          content: [{ type: "text", text: "知识库为空" }],
          details: { count: 0 },
        };
      }

      const entries: string[] = [];
      for (const file of files) {
        const id = file.replace(MD_EXTENSION_REGEX, "");
        try {
          const content = await readFile(join(knowledgeDir, file), "utf-8");
          entries.push(`- **${id}**: ${extractTitle(content, id)}`);
        } catch {
          entries.push(`- **${id}**`);
        }
      }

      return {
        content: [
          {
            type: "text",
            text: `知识库条目 (${entries.length}):\n\n${entries.join("\n")}`,
          },
        ],
        details: { count: entries.length },
      };
    } catch {
      return {
        content: [{ type: "text", text: "知识库目录不存在" }],
        details: { count: 0 },
      };
    }
  },
};
