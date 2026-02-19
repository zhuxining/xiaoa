/**
 * workspace-session.ts - 工作区 AgentSession 封装
 *
 * 使用 pi-coding-agent 的 createAgentSession() 创建工作区对话会话。
 */

import type { AgentTool, ThinkingLevel } from "@mariozechner/pi-agent-core";
import type { Model } from "@mariozechner/pi-ai";
import {
  createAgentSession,
  type ToolDefinition,
} from "@mariozechner/pi-coding-agent";
import { createAuthBridge, getXiaoaAgentDir } from "./auth/auth-bridge";
import type { ActiveRun } from "./run/run-types";

/**
 * 从配置解析模型
 *
 * 复用现有 create-agent.ts 中的逻辑。
 * TODO: 后续将 getModelFromConfig 迁移到 src/agent/ 目录。
 */
function resolveModel(): Model<string> {
  // 动态导入以避免循环依赖
  const { getModelFromConfig } = require("@/ipc/chat/agent/create-agent");
  return getModelFromConfig();
}

/**
 * 创建工作区 AgentSession
 *
 * 调用 pi-coding-agent 的 createAgentSession()，配置：
 * - cwd: 工作区根路径
 * - agentDir: ~/.xiaoa/agent/
 * - model: 从全局配置读取
 * - thinkingLevel: 从 run 读取，默认 minimal
 * - tools: 文件/bash 工具（Phase 2 实现）
 * - customTools: memory/knowledge 工具（Phase 2 实现）
 * - authStorage: 认证桥接
 */
export async function createWorkspaceSession(
  run: ActiveRun,
  options?: {
    tools?: AgentTool[];
    customTools?: ToolDefinition[];
  }
): Promise<ReturnType<typeof createAgentSession>> {
  const { tools = [], customTools = [] } = options ?? {};

  const authStorage = createAuthBridge();
  const model = resolveModel();
  const agentDir = getXiaoaAgentDir();
  const thinkingLevel: ThinkingLevel = run.thinkingLevel ?? "minimal";

  const result = await createAgentSession({
    cwd: run.workspaceRootPath ?? process.cwd(),
    agentDir,
    model,
    thinkingLevel,
    tools,
    customTools,
    authStorage,
  });

  return result;
}

/**
 * 创建全局 AgentSession（无项目上下文）
 *
 * 全局对话没有项目目录，只使用 memory/knowledge 工具。
 * TODO: Phase 5 完整实现
 */
export async function createGlobalSession(
  run: ActiveRun,
  options?: {
    customTools?: ToolDefinition[];
  }
): Promise<ReturnType<typeof createAgentSession>> {
  const { customTools = [] } = options ?? {};

  const authStorage = createAuthBridge();
  const model = resolveModel();
  const agentDir = getXiaoaAgentDir();
  const thinkingLevel: ThinkingLevel = run.thinkingLevel ?? "minimal";

  const result = await createAgentSession({
    cwd: process.cwd(),
    agentDir,
    model,
    thinkingLevel,
    tools: [], // 全局对话无文件工具
    customTools,
    authStorage,
  });

  return result;
}

// Re-export for convenience
export { createAuthBridge, getXiaoaAgentDir } from "./auth/auth-bridge";
