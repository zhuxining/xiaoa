/**
 * permission-request.ts - 权限请求模块
 *
 * 实现权限请求的 Promise + IPC 桥接：
 * - requestPermission(): 发送 permission_request 事件并等待响应
 * - waitForPermissionResponse(): 挂起 Promise 直到用户响应
 * - resolvePermissionRequest(): 由 IPC 调用 resolve Promise
 */

import type { ChatEvent } from "@/actions/chat";
import { type ActiveRun, appendEvent } from "../run";
import type { PermissionDecision } from "./permission-policy";
import { checkToolPermission } from "./permission-policy";

/**
 * 待处理的权限请求
 */
interface PendingPermissionRequest {
  /** 工具参数 */
  args: unknown;
  /** 创建时间 */
  createdAt: number;
  /** 权限请求 ID */
  id: string;
  /** reject 函数 */
  reject: (error: Error) => void;
  /** resolve 函数 */
  resolve: (decision: "allow" | "deny") => void;
  /** 运行 ID */
  runId: string;
  /** 工具名称 */
  toolName: string;
}

/**
 * 待处理的权限请求映射
 * key: `${runKey}:${permissionId}`
 */
const pendingRequests = new Map<string, PendingPermissionRequest>();

/**
 * 生成权限请求 ID
 */
function generatePermissionId(): string {
  return `perm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 请求权限
 *
 * 发送 permission_request 事件并等待用户响应。
 * 如果已在 allowedPermissions 中，直接返回 allow。
 *
 * @param run - 运行时实例
 * @param toolName - 工具名称
 * @param args - 工具参数
 * @returns 用户决策
 */
export function requestPermission(
  run: ActiveRun,
  toolName: string,
  args: unknown
): Promise<"allow" | "deny"> {
  // 先检查权限策略
  const decision = checkToolPermission(run, toolName, args);

  // 如果不需要确认，直接返回
  if (!decision.needsConfirmation) {
    if (decision.allowed) {
      return Promise.resolve("allow" as const);
    }
    return Promise.resolve("deny" as const);
  }

  // 如果已被策略拒绝
  if (!decision.allowed) {
    return Promise.resolve("deny" as const);
  }

  // 需要用户确认
  const permissionId = generatePermissionId();
  const runKey = run.key;

  // 构建权限请求事件
  const event: Omit<ChatEvent, "seq" | "timestamp"> = {
    type: "permission_request",
    runId: run.runId,
    scope: run.scope,
    sessionId: run.sessionId,
    workspaceId: run.workspaceId ?? null,
    permissionId,
    permissionType: getPermissionType(toolName),
    permissionTitle: getPermissionTitle(toolName, args),
    permissionDescription: decision.reason,
    permissionDetails: getPermissionDetails(toolName, args),
    permissionRisk: getRiskFromDecision(decision),
  };

  // 发送事件
  appendEvent(runKey, event);

  // 创建 Promise 等待响应
  return new Promise<"allow" | "deny">((resolve, reject) => {
    const requestKey = `${runKey}:${permissionId}`;
    pendingRequests.set(requestKey, {
      id: permissionId,
      toolName,
      args,
      runId: run.runId,
      resolve,
      reject,
      createdAt: Date.now(),
    });

    // 设置超时（5分钟）
    setTimeout(
      () => {
        const req = pendingRequests.get(requestKey);
        if (req) {
          pendingRequests.delete(requestKey);
          reject(new Error("权限请求超时"));
        }
      },
      5 * 60 * 1000
    );
  });
}

/**
 * 响应权限请求
 *
 * 由 IPC 调用，resolve 对应的 Promise。
 *
 * @param runKey - 运行 key
 * @param permissionId - 权限请求 ID
 * @param decision - 用户决策
 * @param alwaysAllowInSession - 是否在会话中始终允许
 */
export function respondToPermissionRequest(
  runKey: string,
  permissionId: string,
  decision: "allow" | "deny",
  _alwaysAllowInSession = false
): boolean {
  const requestKey = `${runKey}:${permissionId}`;
  const request = pendingRequests.get(requestKey);

  if (!request) {
    console.warn(`[permission] 未找到权限请求: ${requestKey}`);
    return false;
  }

  pendingRequests.delete(requestKey);

  // 如果用户选择始终允许，添加到允许列表
  // 注意：这需要访问 ActiveRun，在实际实现中可能需要额外参数

  // resolve Promise
  request.resolve(decision);
  return true;
}

/**
 * 取消所有待处理的权限请求
 *
 * 在运行中止时调用。
 */
export function cancelAllPendingRequests(runKey: string): void {
  for (const [key, request] of pendingRequests.entries()) {
    if (key.startsWith(`${runKey}:`)) {
      pendingRequests.delete(key);
      request.reject(new Error("运行已中止"));
    }
  }
}

/**
 * 获取权限类型
 */
function getPermissionType(
  toolName: string
): "file_read" | "file_write" | "execute" | "network" {
  const normalized = toolName.toLowerCase().replace(/_/g, "-");

  if (
    (normalized.includes("read") ||
      normalized.includes("list") ||
      normalized.includes("search")) &&
    normalized.includes("file")
  ) {
    return "file_read";
  }

  if (
    (normalized.includes("write") ||
      normalized.includes("create") ||
      normalized.includes("delete")) &&
    normalized.includes("file")
  ) {
    return "file_write";
  }

  if (
    normalized === "bash" ||
    normalized === "shell" ||
    normalized === "execute"
  ) {
    return "execute";
  }

  if (
    normalized.includes("web") ||
    normalized.includes("fetch") ||
    normalized.includes("network")
  ) {
    return "network";
  }

  return "execute";
}

/**
 * 获取权限标题
 */
function getPermissionTitle(toolName: string, args: unknown): string {
  const normalized = toolName.toLowerCase().replace(/_/g, "-");

  if (normalized.includes("file-write") || normalized === "write-file") {
    const path = (args as { path?: string })?.path;
    return path ? `写入文件: ${path}` : "写入文件";
  }

  if (normalized.includes("file-delete") || normalized === "delete-file") {
    const path = (args as { path?: string })?.path;
    return path ? `删除文件: ${path}` : "删除文件";
  }

  if (normalized === "bash" || normalized === "shell") {
    const command = (args as { command?: string })?.command;
    if (command) {
      const shortCmd =
        command.length > 50 ? `${command.slice(0, 50)}...` : command;
      return `执行命令: ${shortCmd}`;
    }
    return "执行命令";
  }

  return `执行 ${toolName}`;
}

/**
 * 获取权限详情
 */
function getPermissionDetails(_toolName: string, args: unknown): string {
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
  }
}

/**
 * 从决策结果获取风险等级
 */
function getRiskFromDecision(
  decision: PermissionDecision
): "low" | "medium" | "high" {
  if (decision.reason.includes("高")) {
    return "high";
  }
  if (decision.reason.includes("中")) {
    return "medium";
  }
  return "low";
}

// 导出类型
export type { PendingPermissionRequest };
