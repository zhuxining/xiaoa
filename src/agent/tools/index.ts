/**
 * tools/index.ts - 工具组装
 *
 * buildCustomTools(workspaceId): 组装自定义工具（记忆/知识），通过闭包传递 workspaceId
 * pi 内置工具（read/bash/edit/write/grep/find/ls）通过 codingTools 直接传给 createAgentSession。
 */

import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import {
  createKnowledgeListTool,
  createKnowledgeReadTool,
} from "./knowledge-tools";
import { createMemorySearchTool, createMemoryWriteTool } from "./memory-tools";

/**
 * 组装自定义工具（记忆/知识工具）
 *
 * @param workspaceId - 工作区 ID，null 表示全局小A
 */
export function buildCustomTools(
  workspaceId: string | null
  // biome-ignore lint/suspicious/noExplicitAny: ToolDefinition<TObject> 协变问题，运行时安全
): ToolDefinition<any>[] {
  return [
    createMemorySearchTool(workspaceId),
    createMemoryWriteTool(workspaceId),
    createKnowledgeReadTool(workspaceId),
    createKnowledgeListTool(workspaceId),
  ];
}

// biome-ignore lint/performance/noBarrelFile: 工具模块公开 API 边界
export {
  createKnowledgeListTool,
  createKnowledgeReadTool,
} from "./knowledge-tools";
export {
  appendDailyLog,
  createMemorySearchTool,
  createMemoryWriteTool,
} from "./memory-tools";
