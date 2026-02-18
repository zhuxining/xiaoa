# pi-agent-core 集成设计

本文档详细描述小A如何集成 `@mariozechner/pi-agent-core` SDK，实现完整的 Agent 能力。

## 1. 概述

### 1.1 依赖关系

```text
@mariozechner/pi-ai              ← 多 Provider LLM 统一接口（Model, Message, streamSimple）
  └── @mariozechner/pi-agent-core ← Agent 循环 + 工具执行 + 事件流
        └── 小A                    ← 业务层：记忆、知识库、权限、Fallback Agent
```

### 1.2 核心 SDK 概念

| 概念 | 说明 |
|------|------|
| **Agent 类** | 有状态的 Agent 循环，通过 `prompt()` 发起对话，`subscribe()` 监听事件流 |
| **AgentTool** | 工具定义接口，参数使用 TypeBox schema，`execute` 返回 `{ content, details }` |
| **AgentMessage** | 可通过 declaration merging 扩展的消息联合类型 |
| **convertToLlm** | 将 AgentMessage 转为 LLM 可消费的 Message[]，每次 LLM 调用前执行 |
| **transformContext** | 上下文变换钩子，用于裁剪、记忆注入、Pre-compaction flush |
| **getApiKey** | 按 Provider 获取 API Key 的异步回调 |
| **Steering** | 工具执行期间打断，注入新指令 |
| **Follow-up** | Agent 完成后追加新任务 |

---

## 2. 目录结构

```text
src/ipc/chat/
├── index.ts                    # Router 入口，导出所有 handler
├── handlers.ts                 # oRPC handlers (send, abort, events, steer, followUp)
├── schemas.ts                  # Zod schemas (输入/输出验证)
├── store.ts                    # 薄重导出层，向后兼容
│
├── agent/                      # Agent 核心
│   ├── create-agent.ts         # Agent 工厂函数 + SDK 钩子配置
│   ├── convert-to-llm.ts       # convertToLlm 实现
│   └── transform-context.ts    # transformContext（含 Compaction）
│
├── tools/                      # 工具定义
│   ├── index.ts                # createTools() 入口
│   ├── file-tools.ts           # file_read, file_write, file_list
│   ├── memory-tools.ts         # memory_search, memory_write
│   ├── knowledge-tools.ts      # knowledge_read
│   └── permission-guard.ts     # patchToolsWithPermission 包装器
│
├── permission/                 # 权限系统
│   ├── permission-store.ts     # allowlist 状态管理
│   ├── permission-policy.ts    # getPermissionPolicy 逻辑
│   └── permission-request.ts   # requestPermission Promise 模型
│
└── run/                        # 运行时管理
    ├── run-types.ts            # ActiveRun, PendingPermission, ToolContext 接口
    ├── run-store.ts            # eventBuffers / activeRuns Map
    └── run-executor.ts         # startChatRun / abortChatRun / steerChatRun / followUpChatRun
```

---

## 3. Agent 工厂函数

### 3.1 核心实现

```typescript
// src/ipc/chat/agent/create-agent.ts

import { Agent } from "@mariozechner/pi-agent-core";
import { getModel, type KnownProvider } from "@mariozechner/pi-ai";
import { filterToLlmMessages } from "./convert-to-llm";
import { buildContextTransform } from "./transform-context";
import { createTools } from "../tools";
import { patchToolsWithPermission } from "../tools/permission-guard";
import { readConfig, readCredentials } from "@/ipc/config/store";

// pi-ai 原生支持的 Provider 列表
const PI_AI_NATIVE_PROVIDERS: KnownProvider[] = [
  "anthropic", "openai", "azure-openai-responses", "openai-codex",
  "google", "google-vertex", "google-gemini-cli", "xai", "groq",
  "cerebras", "openrouter", "vercel-ai-gateway", "mistral", "minimax",
  "kimi-coding",
];

export function createAgent(run: ActiveRun): Agent {
  const config = readConfig();
  const toolContext: ToolContext = {
    run,
    projectRoot: resolveProjectRoot(run),
  };

  // 1. 创建工具（不带权限包装）
  const baseTools = run.workspaceId ? createTools(toolContext) : [];

  // 2. 包装权限检查
  const tools = patchToolsWithPermission(baseTools, toolContext);

  // 3. 构建 System Prompt
  const systemPrompt = buildSystemPrompt(run, config);

  // 4. 获取 Model
  const model = getModelFromConfig(config);

  return new Agent({
    initialState: {
      systemPrompt,
      model,
      thinkingLevel: "off",
      tools,
      messages: [],
    },
    sessionId: run.key,
    // ✅ 关键 SDK 钩子
    convertToLlm: filterToLlmMessages,
    transformContext: buildContextTransform(run),
    getApiKey: async (provider: string) => getApiKeyForProvider(provider),
  });
}
```

### 3.2 getApiKey 实现

按 Provider 读取对应的 API Key：

```typescript
function getApiKeyForProvider(provider: string): string {
  const credentials = readCredentials();
  // 优先使用 provider 专属 key，回退到通用 apiKey
  return credentials.providers?.[provider] ?? credentials.apiKey ?? "";
}
```

### 3.3 Provider 兼容处理

DeepSeek / Ollama / Custom 需要特殊处理：

```typescript
function getModelFromConfig(config: GlobalConfig) {
  const { provider, model: modelId, endpoint } = config.llm;

  if (provider === "deepseek") {
    // DeepSeek 使用 OpenAI 兼容接口
    return getModel("openai", modelId, {
      apiKey: getApiKeyForProvider("deepseek"),
      baseURL: endpoint || "https://api.deepseek.com/v1",
    });
  }

  if (provider === "ollama") {
    return getModel("openai", modelId, {
      baseURL: endpoint || "http://localhost:11434/v1",
    });
  }

  if (provider === "custom") {
    return getModel("openai", modelId, {
      apiKey: getApiKeyForProvider("custom"),
      baseURL: endpoint,
    });
  }

  // 原生 Provider
  return getModel(provider as KnownProvider, modelId);
}
```

---

## 4. SDK 钩子实现

### 4.1 convertToLlm

将 AgentMessage（含自定义类型）转换为 LLM 可消费的 Message[]：

```typescript
// src/ipc/chat/agent/convert-to-llm.ts

import type { AgentMessage, Message } from "@mariozechner/pi-agent-core";

export function filterToLlmMessages(messages: AgentMessage[]): Message[] {
  return messages
    .map((msg) => {
      switch (msg.role) {
        // 自定义消息类型处理
        case "permission_request":
          // UI-only，不发给 LLM
          return null;

        case "compaction_summary":
          // 转为 user 消息，作为历史摘要
          return {
            role: "user",
            content: `<context-summary>${msg.summary}</context-summary>`,
            timestamp: msg.timestamp,
          };

        case "memory_update":
          // UI-only，不发给 LLM
          return null;

        // 标准消息类型
        case "user":
        case "assistant":
        case "toolResult":
          return msg;

        default:
          return null;
      }
    })
    .filter((msg): msg is Message => msg !== null);
}
```

### 4.2 transformContext

上下文变换：Pre-compaction flush + 历史裁剪

```typescript
// src/ipc/chat/agent/transform-context.ts

const COMPACTION_CHAR_LIMIT = 14_000; // ~3.5k tokens

export function buildContextTransform(run: ActiveRun) {
  return async (messages: AgentMessage[]): Promise<AgentMessage[]> => {
    return maybeCompactMessages(run, messages);
  };
}

export function maybeCompactMessages(
  run: ActiveRun,
  messages: AgentMessage[]
): AgentMessage[] {
  const totalChars = messages.reduce(
    (sum, m) => sum + estimateChars(m),
    0
  );

  if (totalChars <= COMPACTION_CHAR_LIMIT) {
    return messages;
  }

  // 1. Pre-compaction flush：写入 Daily Log
  preCompactionFlush(run, messages);

  // 2. 裁剪旧消息
  const keepMessages: AgentMessage[] = [];
  let currentChars = 0;

  // 从最新往回保留
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const chars = estimateChars(msg);
    if (currentChars + chars <= COMPACTION_CHAR_LIMIT * 0.7) {
      keepMessages.unshift(msg);
      currentChars += chars;
    } else {
      break;
    }
  }

  // 3. 添加 CompactionSummaryMessage
  if (keepMessages.length < messages.length) {
    const summary: CompactionSummaryMessage = {
      role: "compaction_summary",
      summary: `[${new Date().toISOString()}] 上下文已压缩，旧消息已归档到 Daily Log`,
      flushedMessageCount: messages.length - keepMessages.length,
      timestamp: Date.now(),
    };
    return [summary, ...keepMessages];
  }

  return keepMessages;
}
```

---

## 5. 工具系统

### 5.1 工具定义（TypeBox Schema）

```typescript
// src/ipc/chat/tools/file-tools.ts

import type { AgentTool } from "@mariozechner/pi-agent-core";
import { Type } from "@sinclair/typebox";

const fileReadSchema = Type.Object({
  path: Type.String({ description: "文件路径（相对于项目根目录）" }),
});

export function createFileReadTool(context: ToolContext): AgentTool<typeof fileReadSchema> {
  return {
    name: "file_read",
    label: "读取文件",
    description: "读取项目中的文件内容",
    parameters: fileReadSchema,
    execute: async (_toolCallId, { path }) => {
      const fullPath = path.join(context.projectRoot, path);
      const content = await fs.readFile(fullPath, "utf-8");
      return {
        content: [{ type: "text", text: content }],
        details: { path, size: content.length },
      };
    },
  };
}
```

### 5.2 权限包装器

```typescript
// src/ipc/chat/tools/permission-guard.ts

const DANGEROUS_TOOLS = ["file_write"];

export function patchToolsWithPermission(
  tools: AgentTool[],
  context: ToolContext
): AgentTool[] {
  return tools.map((tool) => {
    if (!DANGEROUS_TOOLS.includes(tool.name)) {
      return tool;
    }

    return {
      ...tool,
      execute: async (toolCallId, args, signal) => {
        // 1. 获取权限策略
        const policy = getPermissionPolicy(context.run, tool.name, args);

        if (policy === "deny") {
          throw new Error("操作被权限策略拒绝");
        }

        if (policy === "prompt") {
          // 2. 发起权限请求（Promise 等待用户响应）
          await requestPermission(
            context.run,
            "file_write",
            "moderate",
            "写入文件",
            `即将修改文件: ${args.path}`,
            ""
          );
        }

        // 3. 执行原工具
        return tool.execute(toolCallId, args, signal);
      },
    };
  });
}
```

---

## 6. 权限系统

### 6.1 三级权限模式

```typescript
type PermissionMode = "explore" | "review" | "auto";

// 操作分类
| 操作类型     | Explore | Review    | Auto      |
|-------------|---------|-----------|-----------|
| safe        | ✅ 允许  | ✅ 允许    | ✅ 允许    |
| moderate    | ❌ 拒绝  | ⚠️ 需确认  | ✅ 允许    |
| dangerous   | ❌ 拒绝  | ⚠️ 需确认  | ⚠️ 需确认  |
```

### 6.2 权限请求流程

```typescript
// src/ipc/chat/permission/permission-request.ts

export async function requestPermission(
  run: ActiveRun,
  type: PermissionType,
  risk: PermissionRisk,
  title: string,
  description: string,
  details: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    run.pendingPermission = {
      requestId: generateId(),
      type,
      risk,
      title,
      description,
      details,
      resolve: (allowed: boolean, alwaysAllow: boolean) => {
        run.pendingPermission = null;
        if (allowed) {
          if (alwaysAllow) {
            // 添加到会话白名单
            addToSessionAllowlist(run, type);
          }
          resolve();
        } else {
          reject(new Error("用户拒绝权限请求"));
        }
      },
      reject,
    };

    // 发送事件通知 UI
    appendEvent(run.key, {
      type: "permission_request",
      permissionId: run.pendingPermission.requestId,
      permissionType: type,
      permissionRisk: risk,
      permissionTitle: title,
      permissionDescription: description,
      permissionDetails: details,
      // ...
    });
  });
}
```

---

## 7. 运行时管理

### 7.1 ActiveRun 结构

```typescript
// src/ipc/chat/run/run-types.ts

export interface ActiveRun {
  runId: string;
  key: string;                    // session key: "global:sessionId" | "workspace:workspaceId:sessionId"
  scope: "global" | "workspace";
  workspaceId: string | null;
  sessionId: string;
  content: string;                // 用户输入
  aborted: boolean;
  pendingPermission: PendingPermission | null;
  assistantBuffer: string;        // 累积的 assistant 响应
  agent?: Agent;                  // Agent 实例引用
}

export interface PendingPermission {
  requestId: string;
  type: PermissionType;
  risk: PermissionRisk;
  title: string;
  description: string;
  details: string;
  resolve: (allowed: boolean, alwaysAllow: boolean) => void;
  reject: (error: Error) => void;
}

export interface ToolContext {
  run: ActiveRun;
  projectRoot: string;
}
```

### 7.2 IPC Endpoints

```typescript
// src/ipc/chat/run/run-executor.ts

// 发起对话
export function startChatRun(input: ChatSendInput): { runId: string }

// 中断对话
export function abortChatRun(input: ChatAbortInput): { aborted: boolean }

// 获取事件流
export function getChatEvents(input: ChatGetEventsInput): ChatEventsResult

// 响应权限请求
export function respondChatPermission(input: ChatRespondPermissionInput): { applied: boolean }

// Steering: 中途打断
export function steerChatRun(input: ChatSteerInput): { queued: boolean }

// Follow-up: 完成后追加
export function followUpChatRun(input: ChatFollowUpInput): { queued: boolean }
```

---

## 8. 自定义消息类型

### 8.1 Declaration Merging

```typescript
// src/types/agent-messages.ts

import type { PermissionRisk, PermissionType } from "@/ipc/chat/schemas";

export interface PermissionRequestMessage {
  role: "permission_request";
  permissionId: string;
  permissionType: PermissionType;
  permissionRisk: PermissionRisk;
  permissionTitle: string;
  permissionDescription: string;
  permissionDetails: string;
  timestamp: number;
}

export interface CompactionSummaryMessage {
  role: "compaction_summary";
  summary: string;
  flushedMessageCount: number;
  timestamp: number;
}

export interface MemoryUpdateMessage {
  role: "memory_update";
  content: string;
  timestamp: number;
}

declare module "@mariozechner/pi-agent-core" {
  interface CustomAgentMessages {
    permission_request: PermissionRequestMessage;
    compaction_summary: CompactionSummaryMessage;
    memory_update: MemoryUpdateMessage;
  }
}
```

### 8.2 消息处理规则

| 类型 | LLM 可见 | convertToLlm 处理 |
|------|---------|-------------------|
| `permission_request` | ❌ | 过滤（返回 `null`） |
| `compaction_summary` | ✅ | 转为 `UserMessage`（历史摘要） |
| `memory_update` | ❌ | 过滤（返回 `null`） |

---

## 9. Fallback Agent

当未配置 LLM API Key 时，使用模式匹配执行工具：

```typescript
// src/ipc/chat/run/run-executor.ts

async function runFallbackAgent(run: ActiveRun): Promise<void> {
  const tools = patchToolsWithPermission(createTools(context), context);
  const plans = buildFallbackPlans(run.content);

  // 模式匹配：解析用户意图
  const FILE_WRITE_REGEX = /写入|修改|创建|write|edit/i;
  const FILE_READ_REGEX = /读取|查看|read|cat/i;

  // 执行匹配到的工具
  for (const plan of plans) {
    const tool = tools.find(t => t.name === plan.name);
    if (tool) {
      await tool.execute(generateId(), plan.args);
    }
  }

  // 返回友好提示
  await streamAssistantText(run,
    `已执行 ${plans.length} 个工具。\n\n当前运行在本地 fallback 模式（未配置可用 LLM Key）。`
  );
}
```

---

## 10. 事件流

### 10.1 ChatEvent Schema

```typescript
// src/ipc/chat/schemas.ts

export const chatEventTypeSchema = z.enum([
  "run_start",
  "message_start",
  "message_delta",
  "message_end",
  "tool_start",
  "tool_end",
  "permission_request",
  "permission_resolved",
  "run_aborted",
  "run_error",
  "run_end",
]);
```

### 10.2 AgentEvent 映射

```typescript
// src/ipc/chat/run/run-executor.ts

export function handleAgentStreamEvent(run: ActiveRun, event: AgentEvent): void {
  switch (event.type) {
    case "message_update":
      // 追加 text_delta
      run.assistantBuffer += event.assistantMessageEvent.delta;
      appendEvent(run.key, { type: "message_delta", content: delta, ... });
      break;

    case "tool_execution_start":
      appendEvent(run.key, { type: "tool_start", toolName: event.toolName, ... });
      break;

    case "tool_execution_end":
      appendEvent(run.key, { type: "tool_end", toolName: event.toolName, ... });
      break;

    case "message_end":
      // 最终确认 assistant 消息
      break;

    default:
      break;
  }
}
```

---

## 11. Steering / Follow-up IPC

### 11.1 Schema

```typescript
// src/ipc/chat/schemas.ts

export const chatSteerInputSchema = z.object({
  scope: chatScopeSchema,
  workspaceId: z.string().optional(),
  sessionId: z.string(),
  message: z.string().min(1),
});

export const chatFollowUpInputSchema = z.object({
  scope: chatScopeSchema,
  workspaceId: z.string().optional(),
  sessionId: z.string(),
  message: z.string().min(1),
});
```

### 11.2 实现

```typescript
// src/ipc/chat/run/run-executor.ts

export function steerChatRun(input: ChatSteerInput): { queued: boolean } {
  const run = getActiveRun(input);
  if (!run?.agent) return { queued: false };

  run.agent.steer({
    role: "user",
    content: input.message,
    timestamp: Date.now(),
  });

  return { queued: true };
}

export function followUpChatRun(input: ChatFollowUpInput): { queued: boolean } {
  const run = getActiveRun(input);
  if (!run?.agent) return { queued: false };

  run.agent.followUp({
    role: "user",
    content: input.message,
    timestamp: Date.now(),
  });

  return { queued: true };
}
```

### 11.3 客户端 Actions

```typescript
// src/actions/chat.ts

export async function steerChat(input: ChatSteerInput): Promise<{ queued: boolean }> {
  return await ipc.client.chat.steer(input);
}

export async function followUpChat(input: ChatFollowUpInput): Promise<{ queued: boolean }> {
  return await ipc.client.chat.followUp(input);
}
```

---

## 12. Provider 支持

### 12.1 完整 Provider 列表

```typescript
// src/ipc/config/schemas.ts

export const providerSchema = z.enum([
  // pi-ai 原生支持
  "anthropic",
  "openai",
  "azure-openai-responses",
  "openai-codex",
  "google",
  "google-vertex",
  "google-gemini-cli",
  "xai",
  "groq",
  "cerebras",
  "openrouter",
  "vercel-ai-gateway",
  "mistral",
  "minimax",
  "kimi-coding",
  // 兼容处理
  "deepseek",  // OpenAI 兼容
  "ollama",    // OpenAI 兼容（本地）
  "custom",    // 自定义端点
]);
```

### 12.2 凭证存储

```typescript
interface CredentialStore {
  apiKey?: string;                              // 通用 API Key（向后兼容）
  providers?: Partial<Record<string, string>>;  // Provider 专属 Key
}
```

---

## 13. 测试策略

### 13.1 单元测试覆盖

```text
src/tests/unit/chat-store.test.ts
├── streams and persists global assistant response
├── aborts workspace run without assistant persistence
├── review mode waits permission and can continue after allow
├── explore mode rejects dangerous operation
├── auto mode honors dangerousAutoConfirm switch
├── explore mode allows read-only tools without extra permission
├── fallback agent executes tools and emits tool events
├── permission denial produces run_error and no assistant message
├── maybeCompactMessages compacts history and writes daily log
└── handleAgentStreamEvent maps agent events to chat events
```

### 13.2 关键测试模式

- Mock `Agent` 类，验证 `prompt()` / `subscribe()` / `steer()` / `followUp()` 调用
- Mock `fs` 模块，验证文件读写和权限检查
- Mock `readConfig()` / `readCredentials()`，控制 LLM 可用性
