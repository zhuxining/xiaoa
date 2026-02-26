/**
 * workspace-session.ts - 工作区 AgentSession 封装
 *
 * 使用 pi-coding-agent 的完整栈：
 * - DefaultResourceLoader: 加载 skills/prompts，注入 extensionFactories
 * - SessionManager.open(path): 绑定持久化 JSONL 会话文件
 * - createAgentSession: 组装最终 AgentSession
 *
 * agentDir = workspaceDir（{userData}/workspaces/{workspaceId}/）
 *   → pi 自动发现 {workspaceDir}/skills/ 中的 SKILL.md 文件
 */

import type { ThinkingLevel } from "@mariozechner/pi-agent-core";
import {
  type CreateAgentSessionResult,
  codingTools,
  createAgentSession,
  DefaultResourceLoader,
  SessionManager,
} from "@mariozechner/pi-coding-agent";
import { createAuthBridge } from "./auth/auth-bridge";
import { createXiaoaExtension } from "./extension-factory";
import { getModelFromConfig } from "./model";
import { getGlobalDir, getSessionFilePath, getWorkspaceDir } from "./paths";
import type { ActiveRun } from "./run/run-types";
import { buildCustomTools } from "./tools";

/**
 * 创建工作区 AgentSession
 *
 * @param run - 当前活跃运行（包含 workspaceId、sessionId、workspaceRootPath 等）
 */
export async function createWorkspaceSession(
  run: ActiveRun
): Promise<CreateAgentSessionResult> {
  const workspaceDir = getWorkspaceDir(run.workspaceId ?? "default");
  const cwd = run.workspaceRootPath ?? process.cwd();
  const sessionFile = getSessionFilePath(run.workspaceId, run.sessionId);

  const loader = new DefaultResourceLoader({
    cwd,
    agentDir: workspaceDir,
    extensionFactories: [createXiaoaExtension(run)],
    noExtensions: true, // 只使用 extensionFactories，不加载文件扩展
    noThemes: true, // Electron UI 不需要 pi 主题
  });

  return await createAgentSession({
    cwd,
    agentDir: workspaceDir,
    model: getModelFromConfig(),
    thinkingLevel: (run.thinkingLevel ?? "minimal") as ThinkingLevel,
    tools: codingTools, // read + bash + edit + write
    customTools: buildCustomTools(run.workspaceId ?? null),
    authStorage: createAuthBridge(),
    resourceLoader: loader,
    sessionManager: SessionManager.open(sessionFile),
  });
}

/**
 * 创建全局 AgentSession（无项目上下文）
 *
 * 全局对话无文件工具（无 cwd），只使用记忆/知识工具。
 */
export async function createGlobalSession(
  run: ActiveRun
): Promise<CreateAgentSessionResult> {
  const globalDir = getGlobalDir();
  const sessionFile = getSessionFilePath(null, run.sessionId);

  const loader = new DefaultResourceLoader({
    cwd: process.cwd(),
    agentDir: globalDir,
    extensionFactories: [createXiaoaExtension(run)],
    noExtensions: true,
    noThemes: true,
  });

  return await createAgentSession({
    cwd: process.cwd(),
    agentDir: globalDir,
    model: getModelFromConfig(),
    thinkingLevel: (run.thinkingLevel ?? "minimal") as ThinkingLevel,
    tools: [], // 全局对话无文件工具
    customTools: buildCustomTools(null),
    authStorage: createAuthBridge(),
    resourceLoader: loader,
    sessionManager: SessionManager.open(sessionFile),
  });
}
