/**
 * run-types.ts - ActiveRun 接口定义
 *
 * ActiveRun 代表一个正在进行的对话运行，
 * 持有 AgentSession 实例和相关状态。
 */

import type { AgentSession } from "@mariozechner/pi-coding-agent";
import type { ChatScope } from "@/ipc/chat/schemas";

/**
 * 活跃的对话运行
 */
export interface ActiveRun {
  /** 是否已中止 */
  aborted: boolean;

  /** 本次会话已允许的工具（"本次会话始终允许"） */
  allowedPermissions: Set<string>;

  /** 助手消息缓冲（用于流式响应） */
  assistantBuffer: string;

  /** 用户输入内容 */
  content: string;

  /** 会话键（格式: scope:workspaceId:sessionId 或 global:sessionId） */
  key: string;

  /** 运行唯一标识 */
  runId: string;

  /** 会话范围 */
  scope: ChatScope;

  /** AgentSession 实例（来自 pi-coding-agent） */
  session?: AgentSession;

  /** 会话 ID */
  sessionId: string;

  /** 思考级别（可选，默认 minimal） */
  thinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

  /** 工作区 ID（仅 workspace scope） */
  workspaceId: string | null;

  /** 工作区根路径（仅 workspace scope） */
  workspaceRootPath: string | null;
}

/** 工具执行上下文（供 ToolDefinition 使用） */
export interface ToolContext {
  projectRoot: string | null;
  run: ActiveRun;
}
