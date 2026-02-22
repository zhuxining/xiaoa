/**
 * permission-policy.ts - 权限策略模块
 *
 * 实现三种权限策略：
 * - explore: 只读模式，拒绝所有写操作
 * - review: 审核模式，写操作需要确认
 * - auto: 自动模式，低/中风险自动通过
 */

import { getWorkspace } from "@/ipc/workspace/store";
import type { ActiveRun } from "../run";

/** 命令分隔正则表达式 */
const WHITESPACE_REGEX = /\s+/;

/**
 * 权限策略类型
 */
export type PermissionPolicy = "explore" | "review" | "auto";

/**
 * 工具风险等级
 */
export type ToolRisk = "low" | "medium" | "high";

/**
 * 权限决策结果
 */
export interface PermissionDecision {
  /** 是否允许执行 */
  allowed: boolean;
  /** 是否需要用户确认 */
  needsConfirmation: boolean;
  /** 决策原因 */
  reason: string;
}

/**
 * 高危命令列表
 */
const DESTRUCTIVE_COMMANDS = [
  "rm",
  "rmdir",
  "dd",
  "mkfs",
  "format",
  "fdisk",
  "shred",
  "wipe",
  "del",
  "erase",
];

/**
 * 只读命令列表
 */
const READ_ONLY_COMMANDS = [
  "ls",
  "cat",
  "head",
  "tail",
  "less",
  "more",
  "grep",
  "find",
  "which",
  "whereis",
  "whoami",
  "pwd",
  "echo",
  "stat",
  "file",
  "du",
  "df",
  "ps",
  "top",
  "htop",
  "free",
  "uname",
  "date",
  "uptime",
  "id",
  "groups",
  "env",
  "printenv",
];

/**
 * 获取运行时的权限策略
 *
 * 从 workspace 配置读取，默认为 review
 */
export function getPermissionPolicy(run: ActiveRun): PermissionPolicy {
  if (!run.workspaceId) {
    return "review";
  }
  const workspace = getWorkspace(run.workspaceId);
  return (workspace?.permissions?.mode as PermissionPolicy) ?? "review";
}

/**
 * 获取工具的风险等级
 *
 * @param toolName - 工具名称
 * @param args - 工具参数
 * @returns 风险等级
 */
export function getToolRisk(toolName: string, args: unknown): ToolRisk {
  const normalizedTool = toolName.toLowerCase().replace(/_/g, "-");

  // 文件读取工具 - 低风险
  if (
    normalizedTool === "file-read" ||
    normalizedTool === "read-file" ||
    normalizedTool === "file-list" ||
    normalizedTool === "list-files" ||
    normalizedTool === "file-search" ||
    normalizedTool === "search-files"
  ) {
    return "low";
  }

  // 文件写入工具 - 中等风险
  if (
    normalizedTool === "file-write" ||
    normalizedTool === "write-file" ||
    normalizedTool === "file-create" ||
    normalizedTool === "create-file" ||
    normalizedTool === "file-delete" ||
    normalizedTool === "delete-file"
  ) {
    return "medium";
  }

  // Bash 工具 - 根据命令判断风险
  if (
    normalizedTool === "bash" ||
    normalizedTool === "shell" ||
    normalizedTool === "execute"
  ) {
    return getBashCommandRisk(args);
  }

  // 网络/记忆/知识工具 - 低风险
  if (
    normalizedTool === "memory-search" ||
    normalizedTool === "memory-write" ||
    normalizedTool === "knowledge-read" ||
    normalizedTool === "web-search" ||
    normalizedTool === "web-fetch"
  ) {
    return "low";
  }

  // 默认中等风险
  return "medium";
}

/**
 * 获取 Bash 命令的风险等级
 */
function getBashCommandRisk(args: unknown): ToolRisk {
  if (!args || typeof args !== "object" || !("command" in args)) {
    return "medium";
  }

  const command = (args as { command: string }).command.toLowerCase();
  const cmdParts = command.split(WHITESPACE_REGEX);
  const baseCmd = cmdParts[0];

  // 检查高危命令
  for (const destructive of DESTRUCTIVE_COMMANDS) {
    if (baseCmd === destructive || command.includes(` ${destructive} `)) {
      return "high";
    }
  }

  // rm -rf 特殊检查
  if (baseCmd === "rm" && command.includes("-rf")) {
    return "high";
  }

  // 检查只读命令
  for (const readOnly of READ_ONLY_COMMANDS) {
    if (baseCmd === readOnly) {
      return "low";
    }
  }

  // 带有重定向的命令（写入操作）
  if (command.includes(">") || command.includes(">>")) {
    return "medium";
  }

  // 带有管道的命令可能是复杂的
  if (command.includes("|")) {
    return "medium";
  }

  // 默认中等风险
  return "medium";
}

/**
 * 判断权限策略下是否允许执行
 *
 * @param policy - 权限策略
 * @param risk - 工具风险等级
 * @param toolName - 工具名称（用于特殊处理）
 * @returns 权限决策
 */
export function isAllowedInPolicy(
  policy: PermissionPolicy,
  risk: ToolRisk,
  toolName?: string
): PermissionDecision {
  const normalizedTool = toolName?.toLowerCase().replace(/_/g, "-");

  // explore 模式：只允许低风险的只读操作
  if (policy === "explore") {
    if (risk === "low") {
      // 即使是低风险，也不允许写入类工具
      if (
        normalizedTool === "file-write" ||
        normalizedTool === "write-file" ||
        normalizedTool === "file-delete" ||
        normalizedTool === "delete-file"
      ) {
        return {
          allowed: false,
          needsConfirmation: false,
          reason: "explore 模式下不允许写入操作",
        };
      }
      return {
        allowed: true,
        needsConfirmation: false,
        reason: "explore 模式允许低风险只读操作",
      };
    }
    return {
      allowed: false,
      needsConfirmation: false,
      reason: `explore 模式下不允许 ${risk} 风险操作`,
    };
  }

  // review 模式：所有操作都需要确认
  if (policy === "review") {
    return {
      allowed: true,
      needsConfirmation: true,
      reason: "review 模式需要用户确认",
    };
  }

  // auto 模式：低/中风险自动通过，高风险需要确认
  if (policy === "auto") {
    if (risk === "low") {
      return {
        allowed: true,
        needsConfirmation: false,
        reason: "auto 模式允许低风险操作",
      };
    }
    if (risk === "medium") {
      return {
        allowed: true,
        needsConfirmation: false,
        reason: "auto 模式允许中等风险操作",
      };
    }
    // high risk needs confirmation
    return {
      allowed: true,
      needsConfirmation: true,
      reason: "auto 模式下高风险操作需要确认",
    };
  }

  // 默认拒绝
  return {
    allowed: false,
    needsConfirmation: false,
    reason: "未知权限策略",
  };
}

/**
 * 检查工具是否需要权限确认
 *
 * @param run - 运行时实例
 * @param toolName - 工具名称
 * @param args - 工具参数
 * @returns 权限决策
 */
export function checkToolPermission(
  run: ActiveRun,
  toolName: string,
  args: unknown
): PermissionDecision {
  const policy = getPermissionPolicy(run);
  const risk = getToolRisk(toolName, args);

  // 检查是否已在本次运行中被允许
  const toolKey = `${toolName}:${JSON.stringify(args)}`;
  if (run.allowedPermissions.has(toolKey)) {
    return {
      allowed: true,
      needsConfirmation: false,
      reason: "已在本次运行中授权",
    };
  }

  return isAllowedInPolicy(policy, risk, toolName);
}
