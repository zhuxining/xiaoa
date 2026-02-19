/**
 * knowledge-tools.ts - 知识库工具
 *
 * 知识库管理工具：
 * - knowledge_read: 读取知识条目
 * - knowledge_list: 列出知识条目
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { AgentTool, AgentToolResult } from "@mariozechner/pi-agent-core";
import { Type } from "@sinclair/typebox";

/**
 * 知识读取工具参数 Schema
 */
const knowledgeReadSchema = Type.Object({
  id: Type.String({
    description: "知识条目 ID（文件名，不含 .md 后缀）",
  }),
});

/**
 * 知识列表工具参数 Schema
 */
const knowledgeListSchema = Type.Object({});

/**
 * 获取知识库目录
 */
function getKnowledgeDir(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  return path.join(home, ".xiaoa", "agent", "knowledge");
}

/**
 * 创建知识读取工具
 */
export function createKnowledgeReadTool(): AgentTool<
  typeof knowledgeReadSchema
> {
  return {
    name: "knowledge_read",
    description: "读取知识库中的条目",
    parameters: knowledgeReadSchema,
    label: "读取知识",
    async execute(
      _toolCallId: string,
      params: { id: string },
      _signal?: AbortSignal
    ): Promise<AgentToolResult<undefined>> {
      const { id } = params;

      // 安全检查：防止路径遍历
      if (id.includes("..") || id.includes("/") || id.includes("\\")) {
        return {
          content: [{ type: "text", text: "无效的知识条目 ID" }],
          details: undefined,
        };
      }

      const knowledgeDir = getKnowledgeDir();
      const filePath = path.join(knowledgeDir, `${id}.md`);

      try {
        const content = await fs.readFile(filePath, "utf-8");
        return {
          content: [{ type: "text", text: content }],
          details: undefined,
        };
      } catch {
        return {
          content: [{ type: "text", text: `知识条目 "${id}" 不存在` }],
          details: undefined,
        };
      }
    },
  };
}

/**
 * 创建知识列表工具
 */
export function createKnowledgeListTool(): AgentTool<
  typeof knowledgeListSchema
> {
  return {
    name: "knowledge_list",
    description: "列出知识库中的所有条目",
    parameters: knowledgeListSchema,
    label: "列出知识",
    async execute(
      _toolCallId: string,
      _params: Record<string, never>,
      _signal?: AbortSignal
    ): Promise<AgentToolResult<{ count: number }>> {
      const knowledgeDir = getKnowledgeDir();

      try {
        const files = await fs.readdir(knowledgeDir);
        const mdFiles = files.filter((f) => f.endsWith(".md"));

        if (mdFiles.length === 0) {
          return {
            content: [{ type: "text", text: "知识库为空" }],
            details: { count: 0 },
          };
        }

        // 提取标题（从 frontmatter 或第一行）
        const entries: string[] = [];
        for (const file of mdFiles) {
          const id = file.replace(/\.md$/, "");
          try {
            const content = await fs.readFile(
              path.join(knowledgeDir, file),
              "utf-8"
            );
            const lines = content.split("\n");
            let title = id;

            // 检查 frontmatter 中的 title
            if (lines[0] === "---") {
              for (let i = 1; i < lines.length; i++) {
                if (lines[i] === "---") {
                  break;
                }
                if (lines[i].startsWith("title:")) {
                  title = lines[i].slice(6).trim();
                  break;
                }
              }
            } else if (lines[0].startsWith("# ")) {
              // 使用第一个标题
              title = lines[0].slice(2).trim();
            }

            entries.push(`- **${id}**: ${title}`);
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
}
