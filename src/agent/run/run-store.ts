/**
 * run-store.ts - 运行时状态管理
 *
 * 管理活跃的对话运行和事件缓冲。
 */
import type { ChatEvent, ChatScope } from "@/ipc/chat/schemas";
import type { ActiveRun } from "./run-types";

/** 每个会话最大事件数量 */
export const MAX_EVENTS_PER_SESSION = 1000;

/** 事件序列号 */
let eventSeq = 0;

/** 事件缓冲：key -> ChatEvent[] */
export const eventBuffers = new Map<string, ChatEvent[]>();

/** 活跃运行：key -> ActiveRun */
export const activeRuns = new Map<string, ActiveRun>();

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 异步延迟
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 校验工作区 ID（workspace scope 必须提供）
 */
export function requireWorkspaceId(
  scope: ChatScope,
  workspaceId?: string
): string {
  if (scope === "workspace" && !workspaceId) {
    throw new Error("workspace scope requires workspaceId");
  }
  return workspaceId ?? "";
}

/**
 * 生成会话键
 * 格式：scope:workspaceId:sessionId 或 global:sessionId
 */
export function getSessionKey(
  scope: ChatScope,
  sessionId: string,
  workspaceId?: string
): string {
  const resolvedWorkspaceId = scope === "workspace" ? (workspaceId ?? "") : "";
  return `${scope}:${resolvedWorkspaceId}:${sessionId}`;
}

/**
 * 追加事件到缓冲区
 * 自动添加 seq 和 timestamp，限制缓冲区大小。
 */
export function appendEvent(
  key: string,
  event: Omit<ChatEvent, "seq" | "timestamp">
): ChatEvent {
  const fullEvent: ChatEvent = {
    ...event,
    seq: ++eventSeq,
    timestamp: Date.now(),
  };

  const events = eventBuffers.get(key) ?? [];
  events.push(fullEvent);

  // 限制缓冲区大小
  if (events.length > MAX_EVENTS_PER_SESSION) {
    events.splice(0, events.length - MAX_EVENTS_PER_SESSION);
  }

  eventBuffers.set(key, events);
  return fullEvent;
}

/**
 * 从消息对象中提取文本内容
 */
export function extractMessageText(message: unknown): string {
  if (!message || typeof message !== "object") {
    return "";
  }

  const maybe = message as { content?: unknown };
  if (typeof maybe.content === "string") {
    return maybe.content;
  }
  if (!Array.isArray(maybe.content)) {
    return "";
  }

  return maybe.content
    .map((part) => {
      if (!part || typeof part !== "object") {
        return "";
      }
      const entry = part as { type?: string; text?: string };
      return entry.type === "text" && typeof entry.text === "string"
        ? entry.text
        : "";
    })
    .filter(Boolean)
    .join("");
}

/**
 * 获取活跃运行
 */
export function getActiveRun(key: string): ActiveRun | undefined {
  return activeRuns.get(key);
}

/**
 * 设置活跃运行
 */
export function setActiveRun(key: string, run: ActiveRun): void {
  activeRuns.set(key, run);
}

/**
 * 删除活跃运行
 */
export function deleteActiveRun(key: string): boolean {
  return activeRuns.delete(key);
}

/**
 * 获取事件缓冲
 */
export function getEventBuffer(key: string): ChatEvent[] {
  return eventBuffers.get(key) ?? [];
}

/**
 * 清除事件缓冲
 */
export function clearEventBuffer(key: string): void {
  eventBuffers.delete(key);
}
