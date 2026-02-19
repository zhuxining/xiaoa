/**
 * tools/index.ts - 工具组装
 *
 * buildAllTools() 组装所有工具：
 * - tools: 文件/bash 工具（LLM 可调用）
 * - customTools: 记忆/知识工具（LLM 可调用）
 */

import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { ActiveRun } from "../run";
import { createBashTool } from "./bash-tool";
import {
  createFileListTool,
  createFileReadTool,
  createFileWriteTool,
} from "./file-tools";
import {
  createKnowledgeListTool,
  createKnowledgeReadTool,
} from "./knowledge-tools";
import { createMemorySearchTool, createMemoryWriteTool } from "./memory-tools";

/**
 * 工具组装结果
 */
export interface AllTools {
  /** 自定义工具（记忆/知识） */
  customTools: AgentTool<any>[];
  /** LLM 可调用的工具（文件/bash） */
  tools: AgentTool<any>[];
}

/**
 * 组装所有工具
 *
 * @param run - 运行时实例
 * @returns 工具列表
 */
export function buildAllTools(run: ActiveRun): AllTools {
  // 工作区工具（需要 workspaceRootPath）
  const tools: AgentTool<any>[] = [];

  if (run.workspaceRootPath) {
    tools.push(
      createFileReadTool(run),
      createFileWriteTool(run),
      createFileListTool(run),
      createBashTool(run)
    );
  }

  // 全局可用工具（不需要工作区）
  const customTools: AgentTool<any>[] = [
    createMemorySearchTool(),
    createMemoryWriteTool(),
    createKnowledgeReadTool(),
    createKnowledgeListTool(),
  ];

  return { tools, customTools };
}

// 导出各个工具创建函数
export { createBashTool } from "./bash-tool";
export {
  createFileListTool,
  createFileReadTool,
  createFileWriteTool,
} from "./file-tools";
export {
  createKnowledgeListTool,
  createKnowledgeReadTool,
} from "./knowledge-tools";
export {
  appendDailyLog,
  createMemorySearchTool,
  createMemoryWriteTool,
} from "./memory-tools";
