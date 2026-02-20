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

/** 通用工具类型 — AgentTool 约束需要 TSchema，用 Record 替代并抑制错误 */
// @ts-expect-error AgentTool<P> 约束 P extends TSchema，Record<string,unknown> 不满足但结构兼容
type GenericTool = AgentTool<Record<string, unknown>>;

/**
 * 工具组装结果
 */
export interface AllTools {
  /** 自定义工具（记忆/知识） */
  customTools: GenericTool[];
  /** LLM 可调用的工具（文件/bash） */
  tools: GenericTool[];
}

/**
 * 组装所有工具
 *
 * @param run - 运行时实例
 * @returns 工具列表
 */
export function buildAllTools(run: ActiveRun): AllTools {
  // 工作区工具（需要 workspaceRootPath）
  const tools: GenericTool[] = [];

  if (run.workspaceRootPath) {
    tools.push(
      createFileReadTool(run) as unknown as GenericTool,
      createFileWriteTool(run) as unknown as GenericTool,
      createFileListTool(run) as unknown as GenericTool,
      createBashTool(run) as unknown as GenericTool
    );
  }

  // 全局可用工具（不需要工作区）
  const customTools: GenericTool[] = [
    createMemorySearchTool() as unknown as GenericTool,
    createMemoryWriteTool() as unknown as GenericTool,
    createKnowledgeReadTool() as unknown as GenericTool,
    createKnowledgeListTool() as unknown as GenericTool,
  ];

  return { tools, customTools };
}

// 导出各个工具创建函数
// biome-ignore lint/performance/noBarrelFile: 工具模块公开 API 边界
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
