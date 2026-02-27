/**
 * run-executor.ts - AgentSessionEvent → ChatEvent 桥接
 *
 * 将 pi-coding-agent 的 AgentSessionEvent 转换为 xiaoa 的 ChatEvent，
 * 并提供对话运行的启动、中止、Steering 等管理功能。
 *
 * AgentSession 通过 SessionPool 实现长生命周期复用，
 * 避免每次 prompt 都重新创建/销毁。
 */

import type { AgentSessionEvent } from "@mariozechner/pi-coding-agent";
import {
  cancelPendingPermissions,
  respondToPermission,
} from "@/agent/extension";
import {
  createGlobalSession,
  createWorkspaceSession,
  disposeSession,
  getOrCreateSession,
  getPooledSession,
  releaseSession,
} from "@/agent/session";
import type { ChatScope } from "@/ipc/chat/schemas";
import {
  appendEvent,
  deleteActiveRun,
  eventBuffers,
  generateId,
  getActiveRun,
  setActiveRun,
} from "./run-store";
import type { ActiveRun } from "./run-types";

// biome-ignore lint/performance/noBarrelFile: 便捷重导出
export { extractMessageText } from "./run-store";

type AssistantMessageEvent = Extract<
  AgentSessionEvent,
  { type: "message_update" }
>["assistantMessageEvent"];

function makeBaseEvent(run: ActiveRun) {
  return {
    runId: run.runId,
    scope: run.scope,
    workspaceId: run.workspaceId,
    sessionId: run.sessionId,
  };
}

function handleThinkingEvent(
  key: string,
  run: ActiveRun,
  event: AssistantMessageEvent
): boolean {
  if (event.type === "thinking_start") {
    appendEvent(key, { ...makeBaseEvent(run), type: "thinking_start" });
    return true;
  }
  if (event.type === "thinking_delta") {
    const delta = event.delta ?? "";
    if (delta) {
      appendEvent(key, {
        ...makeBaseEvent(run),
        type: "thinking_delta",
        thinkingContent: delta,
      });
    }
    return true;
  }
  if (event.type === "thinking_end") {
    appendEvent(key, {
      ...makeBaseEvent(run),
      type: "thinking_end",
      thinkingContent: event.content ?? "",
    });
    return true;
  }
  return false;
}

function handleMessageUpdate(
  key: string,
  run: ActiveRun,
  event: Extract<AgentSessionEvent, { type: "message_update" }>
): void {
  if (event.assistantMessageEvent.type === "text_delta") {
    const delta = event.assistantMessageEvent.delta ?? "";
    if (!delta) {
      return;
    }
    run.assistantBuffer += delta;
    appendEvent(key, {
      ...makeBaseEvent(run),
      type: "message_delta",
      content: delta,
    });
  } else {
    handleThinkingEvent(key, run, event.assistantMessageEvent);
  }
}

function handleMessageEnd(
  key: string,
  run: ActiveRun,
  event: Extract<AgentSessionEvent, { type: "message_end" }>
): void {
  const message = event.message;
  if (message && (!("role" in message) || message.role === "assistant")) {
    const text = message.content
      .filter(
        (part): part is { type: "text"; text: string } => part.type === "text"
      )
      .map((p) => p.text)
      .join("");
    if (text) {
      run.assistantBuffer = text;
    }
  }
  appendEvent(key, {
    ...makeBaseEvent(run),
    type: "message_end",
    content: run.assistantBuffer,
  });
}

/**
 * 将 AgentSessionEvent 转换并追加到 ChatEvent 缓冲
 */
export function bridgeEvent(key: string, event: AgentSessionEvent): void {
  const run = getActiveRun(key);
  if (!run || run.aborted) {
    return;
  }

  const base = makeBaseEvent(run);

  switch (event.type) {
    case "message_update":
      handleMessageUpdate(key, run, event);
      break;

    case "message_end":
      handleMessageEnd(key, run, event);
      break;

    case "tool_execution_start":
      appendEvent(key, {
        ...base,
        type: "tool_start",
        toolName: event.toolName,
      });
      break;

    case "tool_execution_end":
      appendEvent(key, { ...base, type: "tool_end", toolName: event.toolName });
      break;

    case "auto_compaction_start":
      appendEvent(key, { ...base, type: "compaction_start" });
      break;

    case "auto_compaction_end":
      appendEvent(key, { ...base, type: "compaction_end" });
      break;

    case "auto_retry_start":
      appendEvent(key, {
        ...base,
        type: "retry_start",
        error: event.errorMessage,
      });
      break;

    case "auto_retry_end":
      appendEvent(key, { ...base, type: "retry_end", error: event.finalError });
      break;

    case "turn_start":
      appendEvent(key, { ...base, type: "turn_start" });
      break;

    case "turn_end":
      appendEvent(key, { ...base, type: "turn_end" });
      break;

    case "tool_execution_update":
      appendEvent(key, {
        ...base,
        type: "tool_update",
        toolName: event.toolName,
      });
      break;

    default:
      break;
  }
}

/**
 * 异步执行 Agent 运行
 *
 * 从 SessionPool 获取（或创建）AgentSession，复用跨消息。
 */
async function executeRun(run: ActiveRun): Promise<void> {
  try {
    const { result, isResumed } = await getOrCreateSession(run.key, () =>
      run.scope === "workspace"
        ? createWorkspaceSession(run)
        : createGlobalSession(run)
    );

    run.session = result.session;
    run.isResumed = isResumed;

    // 每次 run 都 subscribe，run 结束后 unsubscribe
    const unsub = result.session.subscribe((event) =>
      bridgeEvent(run.key, event)
    );
    run.unsubscribe = unsub;

    try {
      await result.session.prompt(run.content);
    } finally {
      unsub();
      run.unsubscribe = undefined;
    }
    endChatRun(run);
  } catch (error) {
    const aborted =
      run.aborted || (error instanceof Error && error.message === "ABORTED");
    let errorMessage: string | undefined;
    if (!aborted) {
      errorMessage = error instanceof Error ? error.message : "运行失败";
    }
    endChatRun(run, { aborted, error: errorMessage });
  }
}

/**
 * 创建 ActiveRun 实例
 */
export function createActiveRun(input: {
  scope: ChatScope;
  workspaceId?: string;
  sessionId: string;
  content: string;
  workspaceRootPath?: string;
  thinkingLevel?: ActiveRun["thinkingLevel"];
}): ActiveRun {
  const {
    scope,
    workspaceId,
    sessionId,
    content,
    workspaceRootPath,
    thinkingLevel,
  } = input;

  const key =
    scope === "workspace"
      ? `workspace:${workspaceId ?? ""}:${sessionId}`
      : `global:${sessionId}`;

  return {
    runId: generateId(),
    key,
    scope,
    workspaceId: scope === "workspace" ? (workspaceId ?? null) : null,
    sessionId,
    content,
    workspaceRootPath:
      scope === "workspace" ? (workspaceRootPath ?? null) : null,
    aborted: false,
    isResumed: false,
    assistantBuffer: "",
    allowedPermissions: new Set(),
    thinkingLevel: thinkingLevel ?? "minimal",
    session: null,
  };
}

/**
 * 启动对话运行
 */
export function startChatRun(input: {
  scope: ChatScope;
  workspaceId?: string;
  sessionId: string;
  content: string;
  workspaceRootPath?: string;
  thinkingLevel?: ActiveRun["thinkingLevel"];
}): { runId: string } {
  if (!input.content.trim()) {
    throw new Error("content is required");
  }

  const run = createActiveRun(input);

  // 中止已有运行
  const existing = getActiveRun(run.key);
  if (existing) {
    existing.aborted = true;
    existing.session?.abort().catch(() => {
      /* ignore */
    });
    cancelPendingPermissions(existing.key);
  }

  setActiveRun(run.key, run);

  appendEvent(run.key, {
    runId: run.runId,
    scope: run.scope,
    workspaceId: run.workspaceId,
    sessionId: run.sessionId,
    type: "run_start",
  });

  executeRun(run).catch(() => undefined);

  return { runId: run.runId };
}

/**
 * 发送 run_end 事件并清理
 *
 * 不再销毁 session，仅释放回 pool + 清理 ActiveRun。
 */
export function endChatRun(
  run: ActiveRun,
  options?: { error?: string; aborted?: boolean }
): void {
  const { error, aborted } = options ?? {};

  if (error || aborted) {
    appendEvent(run.key, {
      runId: run.runId,
      scope: run.scope,
      workspaceId: run.workspaceId,
      sessionId: run.sessionId,
      type: aborted ? "run_aborted" : "run_error",
      error,
    });
  }

  appendEvent(run.key, {
    runId: run.runId,
    scope: run.scope,
    workspaceId: run.workspaceId,
    sessionId: run.sessionId,
    type: "run_end",
  });

  // 释放 session 回 pool（不 dispose）
  releaseSession(run.key);
  deleteActiveRun(run.key);
}

/**
 * 中止对话运行
 */
export function abortChatRun(input: {
  scope: ChatScope;
  workspaceId?: string;
  sessionId: string;
  runId?: string;
}): { aborted: boolean } {
  const { scope, workspaceId, sessionId, runId } = input;
  const key =
    scope === "workspace"
      ? `workspace:${workspaceId}:${sessionId}`
      : `global:${sessionId}`;

  const run = getActiveRun(key);
  if (!run) {
    return { aborted: false };
  }
  if (runId && run.runId !== runId) {
    return { aborted: false };
  }

  run.aborted = true;
  run.session?.abort().catch(() => {
    /* ignore */
  });
  cancelPendingPermissions(run.key);

  return { aborted: true };
}

/**
 * 响应权限请求
 */
export function respondChatPermission(input: {
  scope: ChatScope;
  workspaceId?: string;
  sessionId: string;
  runId: string;
  requestId: string;
  decision: "allow" | "deny";
  alwaysAllowInSession?: boolean;
}): { applied: boolean } {
  const {
    scope,
    workspaceId,
    sessionId,
    runId,
    requestId,
    decision,
    alwaysAllowInSession,
  } = input;

  const key =
    scope === "workspace"
      ? `workspace:${workspaceId}:${sessionId}`
      : `global:${sessionId}`;

  const run = getActiveRun(key);
  if (!run || run.runId !== runId) {
    return { applied: false };
  }

  const applied = respondToPermission(
    key,
    requestId,
    decision,
    alwaysAllowInSession ?? false
  );
  return { applied };
}

/**
 * 获取对话事件
 */
export function getChatEvents(input: {
  scope: ChatScope;
  workspaceId?: string;
  sessionId: string;
  afterSeq?: number;
}): {
  events: ReturnType<typeof import("./run-store").getEventBuffer>;
  lastSeq: number;
  running: boolean;
  runId: string | null;
} {
  const { scope, workspaceId, sessionId, afterSeq } = input;
  const key =
    scope === "workspace"
      ? `workspace:${workspaceId}:${sessionId}`
      : `global:${sessionId}`;

  const filterSeq = afterSeq ?? 0;
  const allEvents = eventBuffers.get(key) ?? [];
  const events = allEvents.filter((event) => event.seq > filterSeq);
  const lastSeq =
    events.length > 0 ? (events.at(-1)?.seq ?? filterSeq) : filterSeq;
  const active = getActiveRun(key);

  return {
    events,
    lastSeq,
    running: active !== undefined && !active.aborted,
    runId: active?.runId ?? null,
  };
}

/**
 * Steering: 中途打断 Agent 执行
 */
export function steerChatRun(input: {
  scope: ChatScope;
  workspaceId?: string;
  sessionId: string;
  message: string;
}): { queued: boolean } {
  const { scope, workspaceId, sessionId, message } = input;
  const key =
    scope === "workspace"
      ? `workspace:${workspaceId}:${sessionId}`
      : `global:${sessionId}`;

  const run = getActiveRun(key);
  if (!run?.session) {
    return { queued: false };
  }

  run.session.steer(message).catch(() => {
    /* fire-and-forget */
  });
  return { queued: true };
}

/**
 * Follow-up: Agent 完成后追加新任务
 */
export function followUpChatRun(input: {
  scope: ChatScope;
  workspaceId?: string;
  sessionId: string;
  message: string;
}): { queued: boolean } {
  const { scope, workspaceId, sessionId, message } = input;
  const key =
    scope === "workspace"
      ? `workspace:${workspaceId}:${sessionId}`
      : `global:${sessionId}`;

  const run = getActiveRun(key);
  if (!run?.session) {
    return { queued: false };
  }

  run.session.followUp(message).catch(() => {
    /* fire-and-forget */
  });
  return { queued: true };
}

/**
 * 获取会话统计信息（从 pool 中的 session 获取）
 */
export function getSessionStats(input: {
  scope: ChatScope;
  workspaceId?: string;
  sessionId: string;
}): ReturnType<
  import("@mariozechner/pi-coding-agent").AgentSession["getSessionStats"]
> | null {
  const { scope, workspaceId, sessionId } = input;
  const key =
    scope === "workspace"
      ? `workspace:${workspaceId}:${sessionId}`
      : `global:${sessionId}`;

  const run = getActiveRun(key);
  if (!run?.session) {
    // 也尝试从 pool 获取
    const pooled = getPooledSession(key);
    if (pooled) {
      return pooled.session.getSessionStats();
    }
    return null;
  }
  return run.session.getSessionStats();
}

/**
 * 获取上下文用量（从 pool 中的 session 获取）
 */
export function getContextUsage(input: {
  scope: ChatScope;
  workspaceId?: string;
  sessionId: string;
}): ReturnType<
  import("@mariozechner/pi-coding-agent").AgentSession["getContextUsage"]
> {
  const { scope, workspaceId, sessionId } = input;
  const key =
    scope === "workspace"
      ? `workspace:${workspaceId}:${sessionId}`
      : `global:${sessionId}`;

  const run = getActiveRun(key);
  if (!run?.session) {
    const pooled = getPooledSession(key);
    if (pooled) {
      return pooled.session.getContextUsage();
    }
    return undefined;
  }
  return run.session.getContextUsage();
}

/**
 * 设置活跃工具集（从 pool 中的 session 设置）
 */
export function setActiveTools(input: {
  scope: ChatScope;
  workspaceId?: string;
  sessionId: string;
  toolNames: string[];
}): { applied: boolean } {
  const { scope, workspaceId, sessionId, toolNames } = input;
  const key =
    scope === "workspace"
      ? `workspace:${workspaceId}:${sessionId}`
      : `global:${sessionId}`;

  const run = getActiveRun(key);
  if (run?.session) {
    run.session.setActiveToolsByName(toolNames);
    return { applied: true };
  }

  const { getPooledSession } = require("@/agent/session-pool");
  const pooled = getPooledSession(key);
  if (pooled) {
    pooled.session.setActiveToolsByName(toolNames);
    return { applied: true };
  }

  return { applied: false };
}

/**
 * 删除会话时清理 pool 中对应的 session
 */
export function disposeSessionFromPool(input: {
  scope: ChatScope;
  workspaceId?: string;
  sessionId: string;
}): void {
  const { scope, workspaceId, sessionId } = input;
  const key =
    scope === "workspace"
      ? `workspace:${workspaceId}:${sessionId}`
      : `global:${sessionId}`;

  disposeSession(key);
}

export {
  activeRuns,
  appendEvent,
  deleteActiveRun,
  generateId,
  getActiveRun,
  setActiveRun,
} from "./run-store";
export type { ActiveRun, ToolContext } from "./run-types";
