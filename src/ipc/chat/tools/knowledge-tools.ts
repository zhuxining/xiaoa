import type { AgentTool } from "@mariozechner/pi-agent-core";
import { Type } from "@sinclair/typebox";
import type { ToolContext } from "../run/run-types";

export function createKnowledgeTools(context: ToolContext): AgentTool[] {
  return [
    {
      name: "knowledge_read",
      label: "Knowledge Read",
      description: "从知识库检索信息",
      parameters: Type.Object({
        query: Type.String({ description: "检索关键词或问题" }),
      }),
      execute: async (_toolCallId, rawParams) => {
        const params = rawParams as { query: string };
        if (!context.run.workspaceId) {
          return {
            content: [
              { type: "text" as const, text: "global 会话不支持知识库检索" },
            ],
            details: {},
          };
        }

        // Use dynamic import to avoid circular dependency
        const { knowledgeRead } = await import("../agent/create-agent");
        const text = knowledgeRead(context.run.workspaceId, params.query);

        return {
          content: [{ type: "text" as const, text }],
          details: { query: params.query },
        };
      },
    },
  ];
}
