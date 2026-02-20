import type { AgentEvent } from "@mariozechner/pi-agent-core";
import type { Message as LlmMessage } from "@mariozechner/pi-ai";
import {
  addMessage as addGlobalMessage,
  getMessages as getGlobalMessages,
} from "@/ipc/sisson/global-store";
import {
  addMessage as addWorkspaceMessage,
  getMessages as getWorkspaceMessages,
} from "@/ipc/sisson/workspace-store";
import {
  createAgent,
  resolveProjectRoot,
  shouldUsePiAgent,
} from "../agent/create-agent";
import { maybeCompactMessages } from "../agent/transform-context";
import { createTools } from "../tools";
import { patchToolsWithPermission } from "../tools/permission-guard";
import {
  activeRuns,
  appendEvent,
  eventBuffers,
  generateId,
  sleep,
} from "./run-store";

// biome-ignore lint/performance/noBarrelFile: 向后兼容重导出
export { extractMessageText } from "./run-store";

import type { ActiveRun, ToolContext } from "./run-types";

const STREAM_DELAY_MS = 8;

interface ToolPlan {
  args: Record<string, unknown>;
  name: string;
}

const FILE_WRITE_REGEX = /写入|修改|创建|删除|rename|write|edit|delete|move/i;
const FILE_READ_REGEX = /读取|查看|read|cat/i;
const FILE_LIST_REGEX = /列出|目录|list|tree/i;
const MEMORY_SEARCH_REGEX = /记忆搜索|memory_search|搜索记忆/i;
const MEMORY_WRITE_REGEX = /记住|记录到记忆|memory_write/i;
const KNOWLEDGE_READ_REGEX = /知识|knowledge_read|知识库/i;
const READ_AT_REGEX = /@([^\s]+)/;
const READ_CN_REGEX = /读取\s+([^\s]+)/;
const LIST_CN_REGEX = /列出(?:目录)?\s*([^\s]*)/;
const LIST_EN_REGEX = /list\s+([^\s]+)/i;
const WRITE_CN_REGEX = /写入\s+([^\s]+)\s+([\s\S]+)/;
const MEMORY_SEARCH_CMD_REGEX = /memory_search\s+(.+)/i;
const MEMORY_WRITE_CMD_REGEX = /memory_write\s+([\s\S]+)/i;
const KNOWLEDGE_CMD_REGEX = /knowledge_read\s+([^\s]+)/i;

function toLlmMessages(
  scope: "global" | "workspace",
  workspaceId: string | null,
  sessionId: string
): LlmMessage[] {
  const toEntry = (message: {
    role: string;
    content: string;
    timestamp: number;
  }): LlmMessage => {
    if (message.role === "assistant") {
      return {
        role: "assistant",
        content: [{ type: "text", text: message.content }],
        api: "",
        provider: "",
        model: "",
        usage: {
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 0,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        },
        stopReason: "stop",
        timestamp: message.timestamp,
      } as unknown as LlmMessage;
    }
    return {
      role: "user",
      content: message.content,
      timestamp: message.timestamp,
    };
  };

  if (scope === "global") {
    return getGlobalMessages(sessionId).slice(0, -1).map(toEntry);
  }

  return getWorkspaceMessages(workspaceId || "", sessionId)
    .slice(0, -1)
    .map(toEntry);
}

function persistUserMessage(
  scope: "global" | "workspace",
  workspaceId: string | null,
  sessionId: string,
  content: string
): void {
  if (scope === "global") {
    addGlobalMessage(sessionId, "user", content);
    return;
  }
  addWorkspaceMessage(workspaceId ?? "", sessionId, "user", content);
}

function persistAssistantMessage(run: ActiveRun): void {
  if (!run.assistantBuffer.trim()) {
    return;
  }

  if (run.scope === "global") {
    addGlobalMessage(run.sessionId, "assistant", run.assistantBuffer);
    return;
  }
  addWorkspaceMessage(
    run.workspaceId ?? "",
    run.sessionId,
    "assistant",
    run.assistantBuffer
  );
}

function buildFallbackPlans(content: string): ToolPlan[] {
  const plans: ToolPlan[] = [];

  const readMatch =
    content.match(READ_AT_REGEX) || content.match(READ_CN_REGEX);
  if (FILE_READ_REGEX.test(content) && readMatch?.[1]) {
    plans.push({ name: "file_read", args: { path: readMatch[1] } });
  }

  const listMatch =
    content.match(LIST_CN_REGEX) || content.match(LIST_EN_REGEX);
  if (FILE_LIST_REGEX.test(content)) {
    plans.push({
      name: "file_list",
      args: { path: listMatch?.[1] || "." },
    });
  }

  const writeMatch = content.match(WRITE_CN_REGEX);
  if (FILE_WRITE_REGEX.test(content)) {
    plans.push({
      name: "file_write",
      args: {
        path: writeMatch?.[1] || "README.md",
        content: writeMatch?.[2] || `用户请求：${content}`,
      },
    });
  }

  const memorySearchMatch = content.match(MEMORY_SEARCH_CMD_REGEX);
  if (MEMORY_SEARCH_REGEX.test(content)) {
    plans.push({
      name: "memory_search",
      args: { query: memorySearchMatch?.[1] || content },
    });
  }

  const memoryWriteMatch = content.match(MEMORY_WRITE_CMD_REGEX);
  if (MEMORY_WRITE_REGEX.test(content)) {
    plans.push({
      name: "memory_write",
      args: { content: memoryWriteMatch?.[1] || content },
    });
  }

  const knowledgeMatch = content.match(KNOWLEDGE_CMD_REGEX);
  if (KNOWLEDGE_READ_REGEX.test(content)) {
    plans.push({
      name: "knowledge_read",
      args: { query: knowledgeMatch?.[1] },
    });
  }

  return plans;
}

async function streamAssistantText(
  run: ActiveRun,
  text: string
): Promise<void> {
  appendEvent(run.key, {
    runId: run.runId,
    scope: run.scope,
    workspaceId: run.workspaceId,
    sessionId: run.sessionId,
    type: "message_start",
  });

  for (const ch of text) {
    if (run.aborted) {
      throw new Error("ABORTED");
    }
    run.assistantBuffer += ch;
    appendEvent(run.key, {
      runId: run.runId,
      scope: run.scope,
      workspaceId: run.workspaceId,
      sessionId: run.sessionId,
      type: "message_delta",
      content: ch,
    });
    await sleep(STREAM_DELAY_MS);
  }

  appendEvent(run.key, {
    runId: run.runId,
    scope: run.scope,
    workspaceId: run.workspaceId,
    sessionId: run.sessionId,
    type: "message_end",
    content: run.assistantBuffer,
  });
}

async function runFallbackAgent(run: ActiveRun): Promise<void> {
  const context: ToolContext = {
    run,
    projectRoot: resolveProjectRoot(run),
  };
  const tools = patchToolsWithPermission(createTools(context), context);
  const plans = buildFallbackPlans(run.content);

  const outputs: string[] = [];
  for (const plan of plans) {
    if (run.aborted) {
      throw new Error("ABORTED");
    }

    const tool = tools.find((item) => item.name === plan.name);
    if (!tool) {
      continue;
    }

    appendEvent(run.key, {
      runId: run.runId,
      scope: run.scope,
      workspaceId: run.workspaceId,
      sessionId: run.sessionId,
      type: "tool_start",
      toolName: tool.name,
    });

    try {
      const result = await tool.execute(generateId(), plan.args as never);
      const text = result.content
        .filter((item) => item.type === "text")
        .map((item) => item.text)
        .join("\n");
      outputs.push(`[${tool.name}] ${text.slice(0, 1200)}`);

      appendEvent(run.key, {
        runId: run.runId,
        scope: run.scope,
        workspaceId: run.workspaceId,
        sessionId: run.sessionId,
        type: "tool_end",
        toolName: tool.name,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("Explore 模式只允许只读操作") ||
          error.message.includes("用户拒绝权限请求"))
      ) {
        throw error;
      }

      const message = error instanceof Error ? error.message : "工具执行失败";
      outputs.push(`[${tool.name}] 执行失败: ${message}`);

      appendEvent(run.key, {
        runId: run.runId,
        scope: run.scope,
        workspaceId: run.workspaceId,
        sessionId: run.sessionId,
        type: "tool_end",
        toolName: tool.name,
        error: message,
      });
    }
  }

  const response =
    outputs.length > 0
      ? `已执行 ${outputs.length} 个工具：\n\n${outputs.join("\n\n")}`
      : `已收到你的请求：${run.content}\n\n当前运行在本地 fallback 模式（未配置可用 LLM Key）。`;

  await streamAssistantText(run, response);
}

export function handleAgentStreamEvent(
  run: ActiveRun,
  event: AgentEvent
): void {
  if (run.aborted) {
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
        appendEvent(run.key, {
          runId: run.runId,
          scope: run.scope,
          workspaceId: run.workspaceId,
          sessionId: run.sessionId,
          type: "message_delta",
          content: delta,
        });
      }
      break;

    case "tool_execution_start":
      appendEvent(run.key, {
        runId: run.runId,
        scope: run.scope,
        workspaceId: run.workspaceId,
        sessionId: run.sessionId,
        type: "tool_start",
        toolName: event.toolName,
      });
      break;

    case "tool_execution_end":
      appendEvent(run.key, {
        runId: run.runId,
        scope: run.scope,
        workspaceId: run.workspaceId,
        sessionId: run.sessionId,
        type: "tool_end",
        toolName: event.toolName,
      });
      break;

    case "message_end": {
      const message = event.message;
      // Handle both SDK events (with role) and test events (without role)
      if (message && (!("role" in message) || message.role === "assistant")) {
        const text = message.content
          .filter(
            (part): part is { type: "text"; text: string } =>
              part.type === "text"
          )
          .map((part) => part.text)
          .join("");
        if (text) {
          run.assistantBuffer = text;
        }
      }
      break;
    }

    default:
      // Ignore other event types
      break;
  }
}

async function runPiAgent(run: ActiveRun): Promise<void> {
  const agent = createAgent(run);
  run.agent = agent;

  const history = toLlmMessages(run.scope, run.workspaceId, run.sessionId);
  const compacted = maybeCompactMessages(run, history);

  agent.replaceMessages(compacted);

  appendEvent(run.key, {
    runId: run.runId,
    scope: run.scope,
    workspaceId: run.workspaceId,
    sessionId: run.sessionId,
    type: "message_start",
  });

  const unsubscribe = agent.subscribe((event) => {
    handleAgentStreamEvent(run, event);
  });

  try {
    await agent.prompt(run.content);
  } finally {
    unsubscribe();
  }

  appendEvent(run.key, {
    runId: run.runId,
    scope: run.scope,
    workspaceId: run.workspaceId,
    sessionId: run.sessionId,
    type: "message_end",
    content: run.assistantBuffer,
  });
}

async function executeRun(run: ActiveRun): Promise<void> {
  appendEvent(run.key, {
    runId: run.runId,
    scope: run.scope,
    workspaceId: run.workspaceId,
    sessionId: run.sessionId,
    type: "run_start",
  });

  try {
    if (shouldUsePiAgent(run)) {
      await runPiAgent(run);
    } else {
      await runFallbackAgent(run);
    }

    if (!run.aborted) {
      persistAssistantMessage(run);
    }

    appendEvent(run.key, {
      runId: run.runId,
      scope: run.scope,
      workspaceId: run.workspaceId,
      sessionId: run.sessionId,
      type: "run_end",
    });
  } catch (error) {
    const aborted =
      run.aborted || (error instanceof Error && error.message === "ABORTED");
    let errorMessage: string | undefined;
    if (!aborted) {
      errorMessage = error instanceof Error ? error.message : "运行失败";
    }

    appendEvent(run.key, {
      runId: run.runId,
      scope: run.scope,
      workspaceId: run.workspaceId,
      sessionId: run.sessionId,
      type: aborted ? "run_aborted" : "run_error",
      error: errorMessage,
    });

    appendEvent(run.key, {
      runId: run.runId,
      scope: run.scope,
      workspaceId: run.workspaceId,
      sessionId: run.sessionId,
      type: "run_end",
    });
  } finally {
    activeRuns.delete(run.key);
  }
}

export function startChatRun(input: {
  scope: "global" | "workspace";
  workspaceId?: string;
  sessionId: string;
  content: string;
}): { runId: string } {
  if (!input.content.trim()) {
    throw new Error("content is required");
  }

  const { scope, workspaceId, sessionId, content } = input;

  const key =
    scope === "workspace"
      ? `workspace:${workspaceId}:${sessionId}`
      : `global:${sessionId}`;

  const existing = activeRuns.get(key);
  if (existing) {
    existing.aborted = true;
    existing.agent?.abort();
    existing.pendingPermission?.reject(new Error("ABORTED"));
    existing.pendingPermission = null;
  }

  const runId = generateId();

  const run: ActiveRun = {
    runId,
    key,
    scope,
    workspaceId: scope === "workspace" ? (workspaceId ?? null) : null,
    sessionId,
    content,
    aborted: false,
    pendingPermission: null,
    assistantBuffer: "",
  };

  activeRuns.set(key, run);

  persistUserMessage(scope, run.workspaceId, sessionId, content);

  executeRun(run).catch(() => {
    return undefined;
  });

  return { runId };
}

export function abortChatRun(input: {
  scope: "global" | "workspace";
  workspaceId?: string;
  sessionId: string;
  runId?: string;
}): { aborted: boolean } {
  const { scope, workspaceId, sessionId, runId } = input;

  const key =
    scope === "workspace"
      ? `workspace:${workspaceId}:${sessionId}`
      : `global:${sessionId}`;

  const run = activeRuns.get(key);
  if (!run) {
    return { aborted: false };
  }

  if (runId && run.runId !== runId) {
    return { aborted: false };
  }

  run.aborted = true;
  run.agent?.abort();
  run.pendingPermission?.reject(new Error("ABORTED"));
  run.pendingPermission = null;

  return { aborted: true };
}

export function respondChatPermission(input: {
  scope: "global" | "workspace";
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

  const run = activeRuns.get(key);
  if (!run || run.runId !== runId || !run.pendingPermission) {
    return { applied: false };
  }

  if (run.pendingPermission.requestId !== requestId) {
    return { applied: false };
  }

  run.pendingPermission.resolve(
    decision === "allow",
    alwaysAllowInSession ?? false
  );

  return { applied: true };
}

import type { ChatEvent } from "../schemas";

export function getChatEvents(input: {
  scope: "global" | "workspace";
  workspaceId?: string;
  sessionId: string;
  afterSeq?: number;
}): {
  events: ChatEvent[];
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
  const events = (eventBuffers.get(key) ?? []).filter(
    (event) => event.seq > filterSeq
  );
  const lastSeq =
    events.length > 0 ? (events.at(-1)?.seq ?? filterSeq) : filterSeq;
  const active = activeRuns.get(key) ?? null;

  return {
    events,
    lastSeq,
    running: active !== null,
    runId: active?.runId ?? null,
  };
}

export function steerChatRun(input: {
  scope: "global" | "workspace";
  workspaceId?: string;
  sessionId: string;
  message: string;
}): { queued: boolean } {
  const { scope, workspaceId, sessionId, message } = input;

  const key =
    scope === "workspace"
      ? `workspace:${workspaceId}:${sessionId}`
      : `global:${sessionId}`;

  const run = activeRuns.get(key);
  if (!run?.agent) {
    return { queued: false };
  }

  run.agent.steer({
    role: "user",
    content: message,
    timestamp: Date.now(),
  });

  return { queued: true };
}

export function followUpChatRun(input: {
  scope: "global" | "workspace";
  workspaceId?: string;
  sessionId: string;
  message: string;
}): { queued: boolean } {
  const { scope, workspaceId, sessionId, message } = input;

  const key =
    scope === "workspace"
      ? `workspace:${workspaceId}:${sessionId}`
      : `global:${sessionId}`;

  const run = activeRuns.get(key);
  if (!run?.agent) {
    return { queued: false };
  }

  run.agent.followUp({
    role: "user",
    content: message,
    timestamp: Date.now(),
  });

  return { queued: true };
}

// Re-export for backward compatibility
export {
  getModelFromConfig,
  knowledgeRead,
  resolveProjectRoot,
  shouldUsePiAgent,
} from "../agent/create-agent";
