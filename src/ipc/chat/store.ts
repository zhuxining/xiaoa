import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { Agent, type AgentTool } from "@mariozechner/pi-agent-core";
import { getModel, type Message as LlmMessage } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";
import { app } from "electron";
import { readConfig } from "@/ipc/config/store";
import { getKnowledgeContent, listKnowledge } from "@/ipc/knowledge/store";
import { getMemory } from "@/ipc/memory/store";
import { listProjects } from "@/ipc/project/store";
import {
  addMessage as addGlobalMessage,
  getMessages as getGlobalMessages,
} from "@/ipc/sisson/global-store";
import {
  addMessage as addWorkspaceMessage,
  getMessages as getWorkspaceMessages,
  getSession as getWorkspaceSession,
} from "@/ipc/sisson/workspace-store";
import { listSkills } from "@/ipc/skill/store";
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

interface PendingPermission {
  requestId: string;
  type: PermissionType;
  resolve: (allow: boolean, alwaysAllow: boolean) => void;
  reject: (error: Error) => void;
}

interface ActiveRun {
  runId: string;
  key: string;
  scope: ChatScope;
  workspaceId: string | null;
  sessionId: string;
  content: string;
  aborted: boolean;
  pendingPermission: PendingPermission | null;
  assistantBuffer: string;
  agent?: Agent;
}

export interface ToolContext {
  run: ActiveRun;
  projectRoot: string | null;
}

interface ToolPlan {
  name: string;
  args: Record<string, unknown>;
}

const MAX_EVENTS_PER_SESSION = 1000;
const STREAM_DELAY_MS = 8;
const COMPACTION_CHAR_LIMIT = 14_000;
const COMPACTION_KEEP_CHARS = 7000;

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

let eventSeq = 0;

const eventBuffers = new Map<string, ChatEvent[]>();
const activeRuns = new Map<string, ActiveRun>();
const sessionPermissionAllowlist = new Map<string, Set<PermissionType>>();

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const fullEvent: ChatEvent = {
    ...event,
    seq: ++eventSeq,
    timestamp: Date.now(),
  };

  const events = eventBuffers.get(key) ?? [];
  events.push(fullEvent);
  if (events.length > MAX_EVENTS_PER_SESSION) {
    events.splice(0, events.length - MAX_EVENTS_PER_SESSION);
  }
  eventBuffers.set(key, events);

  return fullEvent;
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

async function requestPermission(
  run: ActiveRun,
  type: PermissionType,
  risk: PermissionRisk,
  title: string,
  description: string,
  details: string
): Promise<void> {
  if (isPermissionAllowedInSession(run.key, type)) {
    return;
  }

  const policy = getPermissionPolicy(run);
  if (policy.mode === "explore" && type !== "file_read") {
    throw new Error("Explore 模式只允许只读操作");
  }

  const dangerous = risk === "high";
  const needConfirm =
    dangerous &&
    (policy.mode === "review" ||
      (policy.mode === "auto" && !policy.dangerousAutoConfirm));

  if (!needConfirm) {
    return;
  }

  const requestId = generateId();

  await new Promise<void>((resolve, reject) => {
    run.pendingPermission = {
      requestId,
      type,
      resolve: (allow, alwaysAllow) => {
        appendEvent(run.key, {
          runId: run.runId,
          scope: run.scope,
          workspaceId: run.workspaceId,
          sessionId: run.sessionId,
          type: "permission_resolved",
          permissionId: requestId,
          permissionType: type,
          decision: allow ? "allow" : "deny",
        });

        run.pendingPermission = null;

        if (!allow) {
          reject(new Error("用户拒绝权限请求"));
          return;
        }

        if (alwaysAllow) {
          addSessionPermissionAllow(run.key, type);
        }

        resolve();
      },
      reject,
    };

    appendEvent(run.key, {
      runId: run.runId,
      scope: run.scope,
      workspaceId: run.workspaceId,
      sessionId: run.sessionId,
      type: "permission_request",
      permissionId: requestId,
      permissionType: type,
      permissionRisk: risk,
      permissionTitle: title,
      permissionDescription: description,
      permissionDetails: details,
    });
  });
}

function getWorkspaceDailyDir(workspaceId: string): string {
  return join(
    app.getPath("userData"),
    "workspaces",
    workspaceId,
    "memories",
    "daily"
  );
}

function getDailyLogPath(workspaceId: string, date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return join(getWorkspaceDailyDir(workspaceId), `${yyyy}-${mm}-${dd}.md`);
}

export function appendDailyLog(
  workspaceId: string,
  title: string,
  content: string
): void {
  const dir = getWorkspaceDailyDir(workspaceId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const now = new Date();
  const logPath = getDailyLogPath(workspaceId, now);
  const section = `\n## ${title} (${now.toISOString()})\n\n${content.trim()}\n`;
  appendFileSync(logPath, section, "utf-8");
}

function searchDailyLogs(
  workspaceId: string,
  query: string,
  limit = 5
): Array<{ file: string; snippet: string }> {
  const dir = getWorkspaceDailyDir(workspaceId);
  if (!existsSync(dir)) {
    return [];
  }

  const lowerQuery = query.toLowerCase();
  const items: Array<{ file: string; snippet: string; score: number }> = [];

  for (const file of readdirSync(dir).filter((name) => name.endsWith(".md"))) {
    const content = readFileSync(join(dir, file), "utf-8");
    const idx = content.toLowerCase().indexOf(lowerQuery);
    if (idx < 0) {
      continue;
    }

    const start = Math.max(0, idx - 50);
    const end = Math.min(content.length, idx + query.length + 120);
    items.push({
      file,
      snippet: content.slice(start, end).replace(/\s+/g, " "),
      score: Math.max(1, 1000 - idx),
    });
  }

  items.sort((a, b) => b.score - a.score);
  return items.slice(0, limit).map((item) => ({
    file: item.file,
    snippet: item.snippet,
  }));
}

export function memorySearch(
  workspaceId: string,
  query: string,
  limit = 5
): string {
  const memory = getMemory(workspaceId).content;
  const idx = memory.toLowerCase().indexOf(query.toLowerCase());
  const memoryHit =
    idx >= 0
      ? `MEMORY.md: ${memory
          .slice(Math.max(0, idx - 40), idx + query.length + 100)
          .replace(/\s+/g, " ")}`
      : null;

  const daily = searchDailyLogs(workspaceId, query, limit).map(
    (item) => `${item.file}: ${item.snippet}`
  );

  const all = [...(memoryHit ? [memoryHit] : []), ...daily];
  return all.length > 0 ? all.slice(0, limit).join("\n") : "未找到相关记忆。";
}

export function memoryWrite(workspaceId: string, content: string): string {
  appendDailyLog(workspaceId, "Agent 记忆写入", content);
  return "已写入当日记忆日志。";
}

export function knowledgeRead(
  workspaceId: string,
  query?: string,
  id?: string,
  limit = 3
): string {
  const ready = listKnowledge(workspaceId).filter(
    (item) => item.status === "ready"
  );
  let selected = ready;

  if (id) {
    selected = ready.filter((item) => item.id === id);
  } else if (query) {
    const lower = query.toLowerCase();
    selected = ready.filter((item) => {
      const haystack = `${item.name} ${item.description ?? ""}`.toLowerCase();
      return haystack.includes(lower);
    });
  }

  const top = selected.slice(0, limit);
  if (top.length === 0) {
    return "未找到可用知识。";
  }

  const chunks: string[] = [];
  for (const item of top) {
    const content = getKnowledgeContent(workspaceId, item.id);
    if (!content) {
      continue;
    }
    chunks.push(`# ${item.name}\n${content.content.slice(0, 1500)}`);
  }

  return chunks.length > 0 ? chunks.join("\n\n") : "知识内容暂不可用。";
}

export function resolveProjectRoot(run: ActiveRun): string | null {
  if (run.scope !== "workspace" || !run.workspaceId) {
    return null;
  }

  const session = getWorkspaceSession(run.workspaceId, run.sessionId);
  if (!session?.projectId) {
    return null;
  }

  const project = listProjects(run.workspaceId).find(
    (item) => item.id === session.projectId
  );
  if (project?.path) {
    return project.path;
  }
  return join(app.getPath("userData"), "workspaces", run.workspaceId);
}

function normalizePath(path: string, root: string | null): string {
  if (path.startsWith("/")) {
    return path;
  }
  if (!root) {
    throw new Error("当前会话未绑定项目目录");
  }
  return join(root, path);
}

function assertPathInProject(path: string, root: string | null): void {
  if (!root) {
    throw new Error("当前会话未绑定项目目录");
  }

  const normalizedRoot = root.endsWith("/") ? root : `${root}/`;
  if (path !== root && !path.startsWith(normalizedRoot)) {
    throw new Error("禁止访问项目目录之外的路径");
  }
}

function readFileTool(path: string, context: ToolContext): string {
  const fullPath = normalizePath(path, context.projectRoot);
  assertPathInProject(fullPath, context.projectRoot);

  if (!existsSync(fullPath)) {
    throw new Error(`文件不存在: ${fullPath}`);
  }

  const stat = statSync(fullPath);
  if (stat.size > 1024 * 1024) {
    return `文件过大（${Math.round(stat.size / 1024)}KB），请缩小范围。`;
  }

  return readFileSync(fullPath, "utf-8");
}

function listFileTool(path: string, context: ToolContext): string {
  const dirPath = normalizePath(path || ".", context.projectRoot);
  assertPathInProject(dirPath, context.projectRoot);

  if (!existsSync(dirPath)) {
    throw new Error(`目录不存在: ${dirPath}`);
  }

  const lines = readdirSync(dirPath)
    .filter((name) => !name.startsWith("."))
    .map((name) => {
      const fullPath = join(dirPath, name);
      return `${statSync(fullPath).isDirectory() ? "[D]" : "[F]"} ${name}`;
    });

  return lines.length > 0 ? lines.join("\n") : "目录为空";
}

function writeFileTool(
  path: string,
  content: string,
  context: ToolContext
): string {
  const fullPath = normalizePath(path, context.projectRoot);
  assertPathInProject(fullPath, context.projectRoot);

  const slash = fullPath.lastIndexOf("/");
  if (slash > 0) {
    const dir = fullPath.slice(0, slash);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  writeFileSync(fullPath, content, "utf-8");
  return `已写入 ${fullPath}`;
}

function extractMessageText(message: unknown): string {
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

function composeSystemPrompt(workspaceId: string): string {
  const workspace = getWorkspace(workspaceId);
  const memory = getMemory(workspaceId).content.slice(0, 2200);
  const skills = listSkills(workspaceId)
    .filter((item) => item.enabled)
    .map((item) => {
      const hint = item.argumentHint ? ` 参数: ${item.argumentHint}` : "";
      return `- ${item.name}: ${item.description || "无描述"}${hint}`;
    })
    .join("\n");
  const knowledge = listKnowledge(workspaceId)
    .filter((item) => item.status === "ready")
    .slice(0, 20)
    .map((item) => `- ${item.name}: ${item.description ?? ""}`)
    .join("\n");

  return [
    workspace?.agent?.systemPrompt || "你是一个专业、务实的助手。",
    "",
    "可用技能：",
    skills || "- 无",
    "",
    "知识库概览：",
    knowledge || "- 无",
    "",
    "长期记忆（节选）：",
    memory,
  ].join("\n");
}

function toLlmMessages(
  scope: ChatScope,
  workspaceId: string | null,
  sessionId: string
): LlmMessage[] {
  const toEntry = (message: {
    role: string;
    content: string;
    timestamp: number;
  }): LlmMessage => {
    if (message.role === "assistant") {
      // AssistantMessage.content must be an array, not a string
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

  // Exclude the last message (current user prompt already added by agent.prompt())
  if (scope === "global") {
    return getGlobalMessages(sessionId).slice(0, -1).map(toEntry);
  }

  return getWorkspaceMessages(workspaceId || "", sessionId)
    .slice(0, -1)
    .map(toEntry);
}

function shouldUsePiAgent(_run: ActiveRun): boolean {
  const config = readConfig();
  if (config.llm.provider === "ollama" || config.llm.provider === "custom") {
    return false;
  }
  return !!config.llm.apiKey;
}

type GetModelArgs = Parameters<typeof getModel>;
type GetModelReturn = ReturnType<typeof getModel>;

const DEEPSEEK_MODELS: Record<string, { name: string; reasoning: boolean }> = {
  "deepseek-chat": { name: "DeepSeek Chat (V3)", reasoning: false },
  "deepseek-reasoner": { name: "DeepSeek Reasoner (R1)", reasoning: true },
};

function getModelFromConfig(): GetModelReturn {
  const config = readConfig();
  const provider = config.llm.provider;

  if (provider === "deepseek") {
    const meta = DEEPSEEK_MODELS[config.llm.model] ?? {
      name: config.llm.model,
      reasoning: false,
    };
    return {
      id: config.llm.model,
      name: meta.name,
      api: "openai-completions",
      provider: "deepseek",
      baseUrl: "https://api.deepseek.com/v1",
      reasoning: meta.reasoning,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 64_000,
      maxTokens: 8000,
    } as unknown as GetModelReturn;
  }

  if (
    provider !== "anthropic" &&
    provider !== "openai" &&
    provider !== "openrouter"
  ) {
    throw new Error(`当前 provider 暂不支持 pi-agent-core: ${provider}`);
  }

  const model = getModel(
    provider as GetModelArgs[0],
    config.llm.model as unknown as GetModelArgs[1]
  );

  if (!model) {
    throw new Error(
      `模型 "${config.llm.model}" 在 ${provider} 中不存在，请在设置中选择有效的模型`
    );
  }

  return model;
}

export function createTools(context: ToolContext): AgentTool[] {
  const fileRead: AgentTool = {
    name: "file_read",
    label: "File Read",
    description: "读取项目中的文件内容",
    parameters: Type.Object({
      path: Type.String({ description: "项目内文件路径" }),
    }),
    execute: (_toolCallId, rawParams) => {
      const params = rawParams as { path: string };
      const text = readFileTool(params.path, context);
      return Promise.resolve({
        content: [{ type: "text", text }],
        details: { path: params.path },
      });
    },
  };

  const fileList: AgentTool = {
    name: "file_list",
    label: "File List",
    description: "列出项目目录下的文件",
    parameters: Type.Object({
      path: Type.String({ description: "目录路径" }),
    }),
    execute: (_toolCallId, rawParams) => {
      const params = rawParams as { path: string };
      const text = listFileTool(params.path, context);
      return Promise.resolve({
        content: [{ type: "text", text }],
        details: { path: params.path },
      });
    },
  };

  const fileWrite: AgentTool = {
    name: "file_write",
    label: "File Write",
    description: "写入或创建项目文件",
    parameters: Type.Object({
      path: Type.String({ description: "目标文件路径" }),
      content: Type.String({ description: "写入内容" }),
    }),
    execute: (_toolCallId, rawParams) => {
      const params = rawParams as { path: string; content: string };
      return Promise.resolve({
        content: [
          {
            type: "text",
            text: writeFileTool(params.path, params.content, context),
          },
        ],
        details: { path: params.path },
      });
    },
  };

  const memorySearchTool: AgentTool = {
    name: "memory_search",
    label: "Memory Search",
    description: "从长期记忆和日记中搜索信息",
    parameters: Type.Object({
      query: Type.String({ description: "搜索关键词" }),
      limit: Type.Optional(Type.Number({ minimum: 1, maximum: 20 })),
    }),
    execute: (_toolCallId, rawParams) => {
      const params = rawParams as { query: string; limit?: number };
      if (!context.run.workspaceId) {
        throw new Error("global 会话不支持 memory_search");
      }
      const text = memorySearch(
        context.run.workspaceId,
        params.query,
        params.limit ?? 5
      );
      return Promise.resolve({
        content: [{ type: "text", text }],
        details: { query: params.query },
      });
    },
  };

  const memoryWriteTool: AgentTool = {
    name: "memory_write",
    label: "Memory Write",
    description: "向 Daily Log 写入记忆",
    parameters: Type.Object({
      content: Type.String({ description: "要写入的记忆内容" }),
    }),
    execute: (_toolCallId, rawParams) => {
      const params = rawParams as { content: string };
      if (!context.run.workspaceId) {
        throw new Error("global 会话不支持 memory_write");
      }
      const text = memoryWrite(context.run.workspaceId, params.content);
      return Promise.resolve({
        content: [{ type: "text", text }],
        details: {},
      });
    },
  };

  const knowledgeReadTool: AgentTool = {
    name: "knowledge_read",
    label: "Knowledge Read",
    description: "读取知识库解析内容",
    parameters: Type.Object({
      query: Type.Optional(Type.String({ description: "检索关键词" })),
      id: Type.Optional(Type.String({ description: "知识条目 ID" })),
    }),
    execute: (_toolCallId, rawParams) => {
      const params = rawParams as { query?: string; id?: string };
      if (!context.run.workspaceId) {
        throw new Error("global 会话不支持 knowledge_read");
      }
      const text = knowledgeRead(
        context.run.workspaceId,
        params.query,
        params.id
      );
      return Promise.resolve({
        content: [{ type: "text", text }],
        details: {},
      });
    },
  };

  return [
    fileRead,
    fileWrite,
    fileList,
    memorySearchTool,
    memoryWriteTool,
    knowledgeReadTool,
  ];
}

function patchToolsWithPermission(
  run: ActiveRun,
  tools: AgentTool[]
): AgentTool[] {
  return tools.map((tool) => {
    if (tool.name !== "file_write") {
      return tool;
    }

    const rawExecute = tool.execute;
    return {
      ...tool,
      execute: async (toolCallId, params, signal, onUpdate) => {
        await requestPermission(
          run,
          "file_write",
          "high",
          "写入文件",
          "请求执行文件写入/修改操作",
          JSON.stringify(params)
        );
        return await rawExecute(toolCallId, params, signal, onUpdate);
      },
    };
  });
}

function summarizeMessages(messages: LlmMessage[]): string {
  return messages
    .slice(-12)
    .map((message) => `${message.role}: ${extractMessageText(message)}`)
    .join("\n")
    .slice(0, 1600);
}

function preCompactionFlush(workspaceId: string, summary: string): void {
  appendDailyLog(workspaceId, "Pre-compaction flush", summary);
}

function maybeCompactMessages(
  run: ActiveRun,
  messages: LlmMessage[]
): LlmMessage[] {
  const totalChars = messages.reduce(
    (sum, message) => sum + extractMessageText(message).length,
    0
  );

  if (totalChars < COMPACTION_CHAR_LIMIT) {
    return messages;
  }

  const summary = summarizeMessages(messages);
  if (run.workspaceId) {
    preCompactionFlush(run.workspaceId, summary);
  }

  const compacted: LlmMessage[] = [
    {
      role: "user",
      content: `历史上下文摘要（自动压缩）:\n${summary}`,
      timestamp: Date.now(),
    },
  ];

  let kept = 0;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const text = extractMessageText(messages[i]);
    kept += text.length;
    compacted.unshift(messages[i]);
    if (kept >= COMPACTION_KEEP_CHARS) {
      break;
    }
  }

  return compacted;
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
  if (!run.assistantBuffer.trim()) {
    return;
  }

  if (run.scope === "global") {
    addGlobalMessage(run.sessionId, "assistant", run.assistantBuffer);
    return;
  }

  const workspaceId = requireWorkspaceId(
    run.scope,
    run.workspaceId ?? undefined
  );
  addWorkspaceMessage(
    workspaceId,
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
  const tools = patchToolsWithPermission(run, createTools(context));
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

function handleAgentStreamEvent(run: ActiveRun, event: unknown): void {
  if (run.aborted) {
    return;
  }

  const e = event as {
    type: string;
    assistantMessageEvent?: { type?: string; delta?: string };
    toolName?: string;
    message?: unknown;
  };

  if (
    e.type === "message_update" &&
    e.assistantMessageEvent?.type === "text_delta"
  ) {
    const delta = e.assistantMessageEvent.delta ?? "";
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
    return;
  }

  if (e.type === "tool_execution_start" && e.toolName) {
    appendEvent(run.key, {
      runId: run.runId,
      scope: run.scope,
      workspaceId: run.workspaceId,
      sessionId: run.sessionId,
      type: "tool_start",
      toolName: e.toolName,
    });
    return;
  }

  if (e.type === "tool_execution_end" && e.toolName) {
    appendEvent(run.key, {
      runId: run.runId,
      scope: run.scope,
      workspaceId: run.workspaceId,
      sessionId: run.sessionId,
      type: "tool_end",
      toolName: e.toolName,
    });
    return;
  }

  if (e.type === "message_end" && e.message?.role === "assistant") {
    const text = extractMessageText(e.message);
    if (text) {
      run.assistantBuffer = text;
    }
  }
}

async function runPiAgent(run: ActiveRun): Promise<void> {
  const context: ToolContext = {
    run,
    projectRoot: resolveProjectRoot(run),
  };

  const tools = run.workspaceId
    ? patchToolsWithPermission(run, createTools(context))
    : [];
  const model = getModelFromConfig();
  const systemPrompt = run.workspaceId
    ? composeSystemPrompt(run.workspaceId)
    : "你是一个专业、务实的助手。";
  const history = toLlmMessages(run.scope, run.workspaceId, run.sessionId);
  const compacted = maybeCompactMessages(run, history);

  const agent = new Agent({
    initialState: {
      systemPrompt,
      model,
      tools,
      messages: compacted,
      thinkingLevel: "minimal",
    },
    sessionId: run.key,
    getApiKey: async () => readConfig().llm.apiKey,
  });

  run.agent = agent;

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
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = "运行失败";
      }
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

// 测试辅助导出（仅用于单元测试）
export const __test = {
  appendDailyLog,
  maybeCompactMessages,
  preCompactionFlush,
  handleAgentStreamEvent,
};

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
    existing.agent?.abort();
    existing.pendingPermission?.reject(new Error("ABORTED"));
    existing.pendingPermission = null;
  }

  const run: ActiveRun = {
    runId: generateId(),
    key,
    scope,
    workspaceId: scope === "workspace" ? workspaceId : null,
    sessionId: input.sessionId,
    content: input.content,
    aborted: false,
    pendingPermission: null,
    assistantBuffer: "",
  };

  activeRuns.set(key, run);
  executeRun(run).catch(() => {
    return undefined;
  });

  return { runId: run.runId };
}

export function respondChatPermission(input: RespondPermissionInput): {
  applied: boolean;
} {
  const scope = input.scope;
  const workspaceId =
    scope === "workspace" ? requireWorkspaceId(scope, input.workspaceId) : "";
  const key = getSessionKey(scope, input.sessionId, workspaceId);

  const run = activeRuns.get(key);
  if (!run || run.runId !== input.runId || !run.pendingPermission) {
    return { applied: false };
  }

  if (run.pendingPermission.requestId !== input.requestId) {
    return { applied: false };
  }

  run.pendingPermission.resolve(
    input.decision === "allow",
    input.alwaysAllowInSession ?? false
  );

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
  run.agent?.abort();
  run.pendingPermission?.reject(new Error("ABORTED"));
  run.pendingPermission = null;

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
