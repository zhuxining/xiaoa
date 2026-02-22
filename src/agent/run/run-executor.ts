/**
 * run-executor.ts - AgentSessionEvent → ChatEvent 桥接
 *
 * 将 pi-coding-agent 的 AgentSessionEvent 转换为 xiaoa 的 ChatEvent，
 * 并提供对话运行的启动、中止、Steering 等管理功能。
 */

import type { AgentSessionEvent } from "@mariozechner/pi-coding-agent";
import {
  cancelPendingPermissions,
  respondToPermission,
} from "@/agent/permission";
import {
  createGlobalSession,
  createWorkspaceSession,
} from "@/agent/workspace-session";
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

/**
 * 将 AgentSessionEvent 转换并追加到 ChatEvent 缓冲
 */
export function bridgeEvent(key: string, event: AgentSessionEvent): void {
  const run = getActiveRun(key);
  if (!run || run.aborted) {
    return;
  }

  switch (event.type) {
    case "message_update":
      if (event.assistantMessageEvent.type === "text_delta") {
        const delta = event.assistantMessageEvent.delta ?? "";
        if (!delta) {
          return;
        }
        run.assistantBuffer += delta;
        appendEvent(key, {
          runId: run.runId,
          scope: run.scope,
          workspaceId: run.workspaceId,
          sessionId: run.sessionId,
          type: "message_delta",
          content: delta,
        });
      }
      break;

    case "message_end": {
      const message = event.message;
      if (message && (!("role" in message) || message.role === "assistant")) {
        const text = message.content
          .filter(
            (part): part is { type: "text"; text: string } =>
              part.type === "text"
          )
          .map((p) => p.text)
          .join("");
        if (text) {
          run.assistantBuffer = text;
        }
      }
      appendEvent(key, {
        runId: run.runId,
        scope: run.scope,
        workspaceId: run.workspaceId,
        sessionId: run.sessionId,
        type: "message_end",
        content: run.assistantBuffer,
      });
      break;
    }

    case "tool_execution_start":
      appendEvent(key, {
        runId: run.runId,
        scope: run.scope,
        workspaceId: run.workspaceId,
        sessionId: run.sessionId,
        type: "tool_start",
        toolName: event.toolName,
      });
      break;

    case "tool_execution_end":
      appendEvent(key, {
        runId: run.runId,
        scope: run.scope,
        workspaceId: run.workspaceId,
        sessionId: run.sessionId,
        type: "tool_end",
        toolName: event.toolName,
      });
      break;

    case "auto_compaction_start":
    case "auto_compaction_end":
      // pi-coding-agent 内部处理，暂不转发
      break;

    default:
      break;
  }
}

/**
 * 异步执行 Agent 运行
 */
async function executeRun(run: ActiveRun): Promise<void> {
  try {
    const result =
      run.scope === "workspace"
        ? await createWorkspaceSession(run)
        : await createGlobalSession(run);

    run.session = result.session;

    const unsub = result.session.subscribe((event) =>
      bridgeEvent(run.key, event)
    );
    try {
      await result.session.prompt(run.content);
    } finally {
      unsub();
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
    assistantBuffer: "",
    allowedPermissions: new Set(),
    thinkingLevel: thinkingLevel ?? "minimal",
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

export {
  activeRuns,
  appendEvent,
  deleteActiveRun,
  generateId,
  getActiveRun,
  setActiveRun,
} from "./run-store";
export type { ActiveRun, ToolContext } from "./run-types";
