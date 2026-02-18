import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { ToolContext } from "../run/run-types";
import { createFileTools } from "./file-tools";
import { createKnowledgeTools } from "./knowledge-tools";
import { createMemoryTools } from "./memory-tools";

export function createTools(context: ToolContext): AgentTool[] {
  const tools: AgentTool[] = [
    ...createFileTools(context),
    ...createMemoryTools(context),
    ...createKnowledgeTools(context),
  ];

  return tools;
}
