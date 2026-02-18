/**
 * run-types.ts - ActiveRun 接口定义
 *
 * 定义 Agent 运行时的核心类型，用于管理活跃的对话会话。
 */
import type { AgentSession } from "@mariozechner/pi-coding-agent";
import type { ChatScope, PermissionType } from "@/ipc/chat/schemas";

/**
 * 待处理的权限请求
 */
export interface PendingPermission {
  /** reject 函数，用户拒绝或中止时调用 */
  reject: (error: Error) => void;
  /** 权限请求唯一标识 */
  requestId: string;
  /** resolve 函数，用户允许时调用 */
  resolve: (allow: boolean, alwaysAllow: boolean) => void;
  /** 权限类型 */
  type: PermissionType;
}

/**
 * 活跃的对话运行
 *
 * 每个 ActiveRun 代表一个正在进行的对话会话，
 * 持有 AgentSession 实例和相关状态。
 */
export interface ActiveRun {
  /** 是否已中止 */
  aborted: boolean;

  /** 本次会话已允许的权限（用于 "本次会话始终允许" 功能） */
  allowedPermissions: Set<string>;

  /** 助手消息缓冲（用于流式响应） */
  assistantBuffer: string;

  /** 用户输入内容 */
  content: string;

  /** 会话键（格式: scope:workspaceId:sessionId 或 global:sessionId） */
  key: string;

  /** 待处理的权限请求 */
  pendingPermission: PendingPermission | null;
  /** 运行唯一标识 */
  runId: string;

  /** 会话范围（全局或工作区） */
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

/**
 * 工具执行上下文
 */
export interface ToolContext {
  /** 项目根路径 */
  projectRoot: string | null;
  /** 运行实例 */
  run: ActiveRun;
}
