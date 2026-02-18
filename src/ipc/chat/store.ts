import { addMessage as addGlobalMessage } from "@/ipc/sisson/global-store";
import { addMessage as addWorkspaceMessage } from "@/ipc/sisson/workspace-store";
import { getWorkspace } from "@/ipc/workspace/store";
import type {
  ChatEvent,
  ChatScope,
  PermissionRisk,
  PermissionType,
} from "./schemas";

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

interface RespondPermissionInput {
  scope: ChatScope;
  workspaceId?: string;
  sessionId: string;
  runId: string;
  requestId: string;
  decision: "allow" | "deny";
  alwaysAllowInSession?: boolean;
}

interface ToolPlan {
  toolName: string;
  permissionType: PermissionType;
  risk: PermissionRisk;
  title: string;
  description: string;
}

interface PendingPermission {
  requestId: string;
  type: PermissionType;
  risk: PermissionRisk;
  title: string;
  description: string;
  details: string;
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
  permissionChecked: boolean;
  waitingForPermission: boolean;
  pendingPermission: PendingPermission | null;
  tool: ToolPlan | null;
}

const MAX_EVENTS_PER_SESSION = 800;
const URL_TOOL_REGEX = /https?:\/\//i;
const WEB_SEARCH_REGEX = /搜索|网页|url/i;
const FILE_READ_REGEX = /@|文件|read|目录|list/i;
const FILE_WRITE_REGEX = /写入|修改|创建|删除|rename|write|edit|delete|move/i;
const EXECUTE_REGEX = /执行|run|shell|command|终端/i;

let eventSeq = 0;

const eventBuffers = new Map<string, ChatEvent[]>();
const activeRuns = new Map<string, ActiveRun>();
const sessionPermissionAllowlist = new Map<string, Set<PermissionType>>();

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

function inferToolPlan(content: string): ToolPlan | null {
  if (EXECUTE_REGEX.test(content)) {
    return {
      toolName: "shell_execute",
      permissionType: "execute",
      risk: "high",
      title: "执行命令",
      description: "请求执行命令或脚本",
    };
  }

  if (FILE_WRITE_REGEX.test(content)) {
    return {
      toolName: "file_write",
      permissionType: "file_write",
      risk: "high",
      title: "写入文件",
      description: "请求执行文件写入/修改操作",
    };
  }

  if (URL_TOOL_REGEX.test(content) || WEB_SEARCH_REGEX.test(content)) {
    return {
      toolName: "web_search",
      permissionType: "network",
      risk: "medium",
      title: "访问网络",
      description: "请求访问网络资源",
    };
  }

  if (FILE_READ_REGEX.test(content)) {
    return {
      toolName: "file_read",
      permissionType: "file_read",
      risk: "low",
      title: "读取文件",
      description: "请求读取项目文件内容",
    };
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

function addSessionPermissionAllow(
  key: string,
  permissionType: PermissionType
): void {
  const allowlist =
    sessionPermissionAllowlist.get(key) ?? new Set<PermissionType>();
  allowlist.add(permissionType);
  sessionPermissionAllowlist.set(key, allowlist);
}

function isPermissionAllowedInSession(
  key: string,
  permissionType: PermissionType
): boolean {
  return sessionPermissionAllowlist.get(key)?.has(permissionType) ?? false;
}

function getPermissionPolicy(run: ActiveRun): {
  mode: "explore" | "review" | "auto";
  dangerousAutoConfirm: boolean;
} {
  if (run.scope !== "workspace" || !run.workspaceId) {
    return {
      mode: "review",
      dangerousAutoConfirm: false,
    };
  }

  const workspace = getWorkspace(run.workspaceId);
  return {
    mode: workspace?.permissions?.mode ?? "review",
    dangerousAutoConfirm: workspace?.permissions?.dangerousAutoConfirm ?? false,
  };
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

  run.waitingForPermission = false;
  run.pendingPermission = null;

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

function ensurePermissionState(
  run: ActiveRun
): "continue" | "paused" | "denied" {
  if (!run.tool || run.permissionChecked) {
    return "continue";
  }

  const { mode, dangerousAutoConfirm } = getPermissionPolicy(run);

  if (mode === "explore" && run.tool.permissionType !== "file_read") {
    return "denied";
  }

  if (isPermissionAllowedInSession(run.key, run.tool.permissionType)) {
    run.permissionChecked = true;
    return "continue";
  }

  const dangerous = run.tool.risk === "high";

  const requiresConfirm =
    dangerous &&
    (mode === "review" || (mode === "auto" && !dangerousAutoConfirm));

  if (!requiresConfirm) {
    run.permissionChecked = true;
    return "continue";
  }

  if (!run.pendingPermission) {
    const requestId = generateId();
    const pendingPermission: PendingPermission = {
      requestId,
      type: run.tool.permissionType,
      risk: run.tool.risk,
      title: run.tool.title,
      description: run.tool.description,
      details: run.content,
    };
    run.pendingPermission = pendingPermission;
    run.waitingForPermission = true;

    appendEvent(run.key, {
      runId: run.runId,
      scope: run.scope,
      workspaceId: run.workspaceId,
      sessionId: run.sessionId,
      type: "permission_request",
      permissionId: pendingPermission.requestId,
      permissionType: pendingPermission.type,
      permissionRisk: pendingPermission.risk,
      permissionTitle: pendingPermission.title,
      permissionDescription: pendingPermission.description,
      permissionDetails: pendingPermission.details,
    });
  }

  return "paused";
}

function shouldCheckPermissionNow(run: ActiveRun): boolean {
  return !!run.tool && !run.permissionChecked && run.cursor >= 6;
}

function emitToolStartIfNeeded(run: ActiveRun): void {
  if (!run.tool || run.toolStarted || !run.permissionChecked) {
    return;
  }

  run.toolStarted = true;
  appendEvent(run.key, {
    runId: run.runId,
    scope: run.scope,
    workspaceId: run.workspaceId,
    sessionId: run.sessionId,
    type: "tool_start",
    toolName: run.tool.toolName,
  });
}

function emitMessageDelta(run: ActiveRun): void {
  run.cursor += 1;
  const chunk = run.response.slice(0, run.cursor);
  const previous = run.response.slice(0, run.cursor - 1);
  const delta = chunk.slice(previous.length);

  if (delta.length > 0) {
    appendEvent(run.key, {
      runId: run.runId,
      scope: run.scope,
      workspaceId: run.workspaceId,
      sessionId: run.sessionId,
      type: "message_delta",
      content: delta,
    });
  }
}

function emitToolEndIfNeeded(run: ActiveRun): void {
  if (!run.tool || run.toolFinished || !run.toolStarted || run.cursor < 12) {
    return;
  }

  run.toolFinished = true;
  appendEvent(run.key, {
    runId: run.runId,
    scope: run.scope,
    workspaceId: run.workspaceId,
    sessionId: run.sessionId,
    type: "tool_end",
    toolName: run.tool.toolName,
  });
}

function processRunTick(run: ActiveRun): void {
  if (run.aborted) {
    finishRun(run, "aborted");
    return;
  }

  if (run.waitingForPermission) {
    return;
  }

  if (shouldCheckPermissionNow(run)) {
    const permissionState = ensurePermissionState(run);
    if (permissionState === "denied") {
      finishRun(run, "error", "Explore 模式拒绝危险操作");
      return;
    }
    if (permissionState === "paused") {
      return;
    }
  }

  emitToolStartIfNeeded(run);
  emitMessageDelta(run);
  emitToolEndIfNeeded(run);

  if (run.cursor >= run.response.length) {
    finishRun(run, "completed");
  }
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
  const tool = inferToolPlan(input.content);

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
    permissionChecked: !tool,
    waitingForPermission: false,
    pendingPermission: null,
    tool,
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
    try {
      processRunTick(run);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      finishRun(run, "error", message);
    }
  }, 18);

  return { runId };
}

export function respondChatPermission(input: RespondPermissionInput): {
  applied: boolean;
} {
  const scope = input.scope;
  const workspaceId =
    scope === "workspace" ? requireWorkspaceId(scope, input.workspaceId) : "";
  const key = getSessionKey(scope, input.sessionId, workspaceId);

  const run = activeRuns.get(key);
  if (!run) {
    return { applied: false };
  }

  if (run.runId !== input.runId) {
    return { applied: false };
  }

  if (
    !run.pendingPermission ||
    run.pendingPermission.requestId !== input.requestId
  ) {
    return { applied: false };
  }

  appendEvent(run.key, {
    runId: run.runId,
    scope: run.scope,
    workspaceId: run.workspaceId,
    sessionId: run.sessionId,
    type: "permission_resolved",
    permissionId: run.pendingPermission.requestId,
    permissionType: run.pendingPermission.type,
    decision: input.decision,
  });

  if (input.decision === "deny") {
    finishRun(run, "error", "用户拒绝权限请求");
    return { applied: true };
  }

  if (input.alwaysAllowInSession) {
    addSessionPermissionAllow(key, run.pendingPermission.type);
  }

  run.permissionChecked = true;
  run.waitingForPermission = false;
  run.pendingPermission = null;
  return { applied: true };
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
