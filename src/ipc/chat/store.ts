import { addMessage as addGlobalMessage } from "@/ipc/sisson/global-store";
import { addMessage as addWorkspaceMessage } from "@/ipc/sisson/workspace-store";
import type { ChatEvent, ChatScope } from "./schemas";

interface StartRunInput {
  scope: ChatScope;
  workspaceId?: string;
  sessionId: string;
  content: string;
}

interface AbortRunInput {
  scope: ChatScope;
  workspaceId?: string;
  sessionId: string;
  runId?: string;
}

interface GetEventsInput {
  scope: ChatScope;
  workspaceId?: string;
  sessionId: string;
  afterSeq?: number;
}

interface ActiveRun {
  runId: string;
  key: string;
  scope: ChatScope;
  workspaceId: string | null;
  sessionId: string;
  content: string;
  response: string;
  cursor: number;
  interval: ReturnType<typeof setInterval> | null;
  aborted: boolean;
  toolStarted: boolean;
  toolFinished: boolean;
  toolName: string | null;
}

const MAX_EVENTS_PER_SESSION = 800;
const URL_TOOL_REGEX = /https?:\/\//i;
const WEB_SEARCH_REGEX = /搜索|网页|url/i;
const FILE_TOOL_REGEX = /@|文件|read|write|目录/i;

let eventSeq = 0;

const eventBuffers = new Map<string, ChatEvent[]>();
const activeRuns = new Map<string, ActiveRun>();

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function requireWorkspaceId(scope: ChatScope, workspaceId?: string): string {
  if (scope === "workspace" && !workspaceId) {
    throw new Error("workspace scope requires workspaceId");
  }
  return workspaceId ?? "";
}

function getSessionKey(
  scope: ChatScope,
  sessionId: string,
  workspaceId?: string
): string {
  const resolvedWorkspaceId = scope === "workspace" ? (workspaceId ?? "") : "";
  return `${scope}:${resolvedWorkspaceId}:${sessionId}`;
}

function appendEvent(
  key: string,
  event: Omit<ChatEvent, "seq" | "timestamp">
): ChatEvent {
  const seq = ++eventSeq;
  const timestamp = Date.now();
  const fullEvent: ChatEvent = {
    ...event,
    seq,
    timestamp,
  };

  const events = eventBuffers.get(key) ?? [];
  events.push(fullEvent);
  if (events.length > MAX_EVENTS_PER_SESSION) {
    events.splice(0, events.length - MAX_EVENTS_PER_SESSION);
  }
  eventBuffers.set(key, events);

  return fullEvent;
}

function buildResponse(content: string): string {
  return [
    `已收到你的请求：${content}`,
    "当前响应来自 Main 进程 chat 事件流。",
    "下一步可继续接入真实 pi-agent-core AgentEvent。",
  ].join("\n\n");
}

function inferToolName(content: string): string | null {
  if (URL_TOOL_REGEX.test(content) || WEB_SEARCH_REGEX.test(content)) {
    return "web_search";
  }
  if (FILE_TOOL_REGEX.test(content)) {
    return "file_read";
  }
  return null;
}

function persistUserMessage(input: StartRunInput): void {
  if (input.scope === "global") {
    addGlobalMessage(input.sessionId, "user", input.content);
    return;
  }

  const workspaceId = requireWorkspaceId(input.scope, input.workspaceId);
  addWorkspaceMessage(workspaceId, input.sessionId, "user", input.content);
}

function persistAssistantMessage(run: ActiveRun): void {
  if (run.scope === "global") {
    addGlobalMessage(run.sessionId, "assistant", run.response);
    return;
  }

  const workspaceId = requireWorkspaceId(
    run.scope,
    run.workspaceId ?? undefined
  );
  addWorkspaceMessage(workspaceId, run.sessionId, "assistant", run.response);
}

function finishRun(
  run: ActiveRun,
  reason: "completed" | "aborted" | "error",
  error?: string
): void {
  if (run.interval) {
    clearInterval(run.interval);
    run.interval = null;
  }

  if (reason === "completed") {
    persistAssistantMessage(run);
    appendEvent(run.key, {
      runId: run.runId,
      scope: run.scope,
      workspaceId: run.workspaceId,
      sessionId: run.sessionId,
      type: "message_end",
      content: run.response,
    });
  }

  if (reason === "aborted") {
    appendEvent(run.key, {
      runId: run.runId,
      scope: run.scope,
      workspaceId: run.workspaceId,
      sessionId: run.sessionId,
      type: "run_aborted",
    });
  }

  if (reason === "error") {
    appendEvent(run.key, {
      runId: run.runId,
      scope: run.scope,
      workspaceId: run.workspaceId,
      sessionId: run.sessionId,
      type: "run_error",
      error: error ?? "未知错误",
    });
  }

  appendEvent(run.key, {
    runId: run.runId,
    scope: run.scope,
    workspaceId: run.workspaceId,
    sessionId: run.sessionId,
    type: "run_end",
  });

  activeRuns.delete(run.key);
}

export function startChatRun(input: StartRunInput): { runId: string } {
  if (!input.content.trim()) {
    throw new Error("content is required");
  }

  const scope = input.scope;
  const workspaceId =
    scope === "workspace" ? requireWorkspaceId(scope, input.workspaceId) : "";

  persistUserMessage(input);

  const key = getSessionKey(scope, input.sessionId, workspaceId);
  const existing = activeRuns.get(key);
  if (existing) {
    existing.aborted = true;
    finishRun(existing, "aborted");
  }

  const runId = generateId();
  const response = buildResponse(input.content);
  const toolName = inferToolName(input.content);

  const run: ActiveRun = {
    runId,
    key,
    scope,
    workspaceId: scope === "workspace" ? workspaceId : null,
    sessionId: input.sessionId,
    content: input.content,
    response,
    cursor: 0,
    interval: null,
    aborted: false,
    toolStarted: false,
    toolFinished: false,
    toolName,
  };

  activeRuns.set(key, run);

  appendEvent(key, {
    runId,
    scope,
    workspaceId: run.workspaceId,
    sessionId: input.sessionId,
    type: "run_start",
  });
  appendEvent(key, {
    runId,
    scope,
    workspaceId: run.workspaceId,
    sessionId: input.sessionId,
    type: "message_start",
  });

  run.interval = setInterval(() => {
    if (run.aborted) {
      finishRun(run, "aborted");
      return;
    }

    try {
      if (run.toolName && !run.toolStarted) {
        run.toolStarted = true;
        appendEvent(key, {
          runId,
          scope,
          workspaceId: run.workspaceId,
          sessionId: input.sessionId,
          type: "tool_start",
          toolName: run.toolName,
        });
      }

      run.cursor += 1;
      const chunk = run.response.slice(0, run.cursor);
      const previous = run.response.slice(0, run.cursor - 1);
      const delta = chunk.slice(previous.length);

      if (delta.length > 0) {
        appendEvent(key, {
          runId,
          scope,
          workspaceId: run.workspaceId,
          sessionId: input.sessionId,
          type: "message_delta",
          content: delta,
        });
      }

      if (run.toolName && !run.toolFinished && run.cursor >= 8) {
        run.toolFinished = true;
        appendEvent(key, {
          runId,
          scope,
          workspaceId: run.workspaceId,
          sessionId: input.sessionId,
          type: "tool_end",
          toolName: run.toolName,
        });
      }

      if (run.cursor >= run.response.length) {
        finishRun(run, "completed");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      finishRun(run, "error", message);
    }
  }, 18);

  return { runId };
}

export function abortChatRun(input: AbortRunInput): { aborted: boolean } {
  const scope = input.scope;
  const workspaceId =
    scope === "workspace" ? requireWorkspaceId(scope, input.workspaceId) : "";
  const key = getSessionKey(scope, input.sessionId, workspaceId);

  const run = activeRuns.get(key);
  if (!run) {
    return { aborted: false };
  }

  if (input.runId && run.runId !== input.runId) {
    return { aborted: false };
  }

  run.aborted = true;
  finishRun(run, "aborted");
  return { aborted: true };
}

export function getChatEvents(input: GetEventsInput): {
  events: ChatEvent[];
  lastSeq: number;
  running: boolean;
  runId: string | null;
} {
  const scope = input.scope;
  const workspaceId =
    scope === "workspace" ? requireWorkspaceId(scope, input.workspaceId) : "";
  const key = getSessionKey(scope, input.sessionId, workspaceId);

  const afterSeq = input.afterSeq ?? 0;
  const events = (eventBuffers.get(key) ?? []).filter(
    (event) => event.seq > afterSeq
  );
  const lastSeq =
    events.length > 0 ? (events.at(-1)?.seq ?? afterSeq) : afterSeq;
  const active = activeRuns.get(key) ?? null;

  return {
    events,
    lastSeq,
    running: active !== null,
    runId: active?.runId ?? null,
  };
}
