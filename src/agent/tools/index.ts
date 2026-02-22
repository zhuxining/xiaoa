/**
 * tools/index.ts - 工具组装
 *
 * buildCustomTools(): 组装自定义工具（记忆/知识）
 * pi 内置工具（read/bash/edit/write/grep/find/ls）通过 codingTools 直接传给 createAgentSession。
 */

import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { knowledgeListTool, knowledgeReadTool } from "./knowledge-tools";
import { memorySearchTool, memoryWriteTool } from "./memory-tools";

/**
 * 组装自定义工具（内存/知识工具）
 * 这些工具与项目无关，workspace 和 global 模式都可用。
 */
// biome-ignore lint/suspicious/noExplicitAny: ToolDefinition<TObject> 协变问题，运行时安全
export function buildCustomTools(): ToolDefinition<any>[] {
  return [
    memorySearchTool,
    memoryWriteTool,
    knowledgeReadTool,
    knowledgeListTool,
  ];
}

// biome-ignore lint/performance/noBarrelFile: 工具模块公开 API 边界
export { knowledgeListTool, knowledgeReadTool } from "./knowledge-tools";
export {
  appendDailyLog,
  memorySearchTool,
  memoryWriteTool,
} from "./memory-tools";
