/**
 * permission.ts - 权限请求管理
 *
 * 通过 ChatEvent 事件通道向 Renderer 发送权限请求，
 * 并通过 Promise 等待用户响应。
 *
 * 使用方式：
 *   const result = await requestPermission(run, "bash", { command: "rm -rf /" });
 *   if (result.decision === "deny") { ... }
 *   if (result.alwaysAllow) run.allowedPermissions.add("bash");
 */

import { type ActiveRun, appendEvent } from "../run";

/** 权限请求结果 */
export interface PermissionResult {
  /** 是否选择了"本次会话始终允许" */
  alwaysAllow: boolean;
  decision: "allow" | "deny";
}

interface PendingPermission {
  reject: (error: Error) => void;
  resolve: (result: PermissionResult) => void;
}

/** 等待中的权限请求：`${runKey}:${permissionId}` → PendingPermission */
const pending = new Map<string, PendingPermission>();

function generatePermissionId(): string {
  return `perm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 发送权限请求事件并等待用户响应
 */
export function requestPermission(
  run: ActiveRun,
  toolName: string,
  input: Record<string, unknown>
): Promise<PermissionResult> {
  const permissionId = generatePermissionId();

  appendEvent(run.key, {
    runId: run.runId,
    scope: run.scope,
    workspaceId: run.workspaceId,
    sessionId: run.sessionId,
    type: "permission_request",
    permissionId,
    permissionType: resolvePermissionType(toolName),
    permissionTitle: resolvePermissionTitle(toolName, input),
    permissionDetails: (() => {
      try {
        return JSON.stringify(input, null, 2);
      } catch {
        return String(input);
      }
    })(),
    permissionRisk: "low",
  });

  return new Promise<PermissionResult>((resolve, reject) => {
    const key = `${run.key}:${permissionId}`;
    pending.set(key, { resolve, reject });

    // 5 分钟超时
    setTimeout(
      () => {
        if (pending.has(key)) {
          pending.delete(key);
          reject(new Error("权限请求超时"));
        }
      },
      5 * 60 * 1000
    );
  });
}

/**
 * 响应权限请求（由 IPC handler 调用）
 */
export function respondToPermission(
  runKey: string,
  permissionId: string,
  decision: "allow" | "deny",
  alwaysAllow = false
): boolean {
  const key = `${runKey}:${permissionId}`;
  const p = pending.get(key);
  if (!p) {
    return false;
  }
  pending.delete(key);
  p.resolve({ decision, alwaysAllow });
  return true;
}

/**
 * 取消某个 run 的所有待处理权限请求（run 中止时调用）
 */
export function cancelPendingPermissions(runKey: string): void {
  for (const [key, p] of pending.entries()) {
    if (key.startsWith(`${runKey}:`)) {
      pending.delete(key);
      p.reject(new Error("运行已中止"));
    }
  }
}

function resolvePermissionType(
  toolName: string
): "file_read" | "file_write" | "execute" | "network" {
  if (toolName === "bash") {
    return "execute";
  }
  if (toolName === "write" || toolName === "edit") {
    return "file_write";
  }
  if (toolName === "read") {
    return "file_read";
  }
  return "execute";
}

function resolvePermissionTitle(
  toolName: string,
  input: Record<string, unknown>
): string {
  if (toolName === "bash") {
    const cmd = input.command as string | undefined;
    if (cmd) {
      const short = cmd.length > 60 ? `${cmd.slice(0, 60)}...` : cmd;
      return `执行命令: ${short}`;
    }
    return "执行 Shell 命令";
  }
  if (toolName === "write") {
    const path = input.file_path as string | undefined;
    return path ? `写入文件: ${path}` : "写入文件";
  }
  if (toolName === "edit") {
    const path = input.file_path as string | undefined;
    return path ? `编辑文件: ${path}` : "编辑文件";
  }
  return `执行 ${toolName}`;
}
