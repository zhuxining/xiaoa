# 小A Agent 架构设计（基于 pi-mono v0.53.0 实际 API）

> 目标文件：`docs/design/pi-agent-architecture.md`

---

## 1. 核心原则

全面采用 pi 生态，推翻现有 Agent 代码。

| 能力 | 方案 |
|------|------|
| 工作区 Agent | `@mariozechner/pi-coding-agent` `createAgentSession()` |
| 全局 Agent | `@mariozechner/pi-agent-core` `Agent` 类 |
| 文件/Bash 工具 | 自定义工具（内部调用 pi 内置工具逻辑）+ 权限对话 |
| 自定义工具 | `customTools`：memory_search, memory_write, knowledge_read |
| 权限控制 | 工具 `execute()` 内部调用 `ctx.ui.confirm()` |
| 会话持久化 | pi `SessionManager`（agentDir 指向 `~/.xiaoa/agent/`）|
| Compaction | pi-coding-agent 自动处理 |
| Skill 系统 | SKILL.md 文件（`~/.xiaoa/agent/skills/`），ResourceLoader 发现 |
| 认证 | `AuthStorage.inMemory() + setFallbackResolver()` 桥接 |
| Chat UI | 继续使用 xiaoa 自己的 React + shadcn/ui 组件 |

**废弃**（全部推翻）：

- `src/ipc/chat/store.ts` + 所有子模块（agent/, tools/, permission/, run/）
- `src/ipc/sisson/`（替换为基于 pi SessionManager 的 `src/ipc/session/`）
- 手动 Compaction、手动 System Prompt 组装、`patchToolsWithPermission`

---

## 2. 关键 API 速查（v0.53.0 实际接口）

### createAgentSession

```typescript
import { createAgentSession, codingTools, type ToolDefinition } from "@mariozechner/pi-coding-agent";

const { session, extensionsResult } = await createAgentSession({
  cwd: string,                   // 项目根目录
  agentDir: string,              // 存储目录（重定向到 ~/.xiaoa/agent/）
  model: Model<any>,             // 从 pi-ai getModel() 获取
  thinkingLevel: ThinkingLevel,  // "off"|"minimal"|"low"|"medium"|"high"|"xhigh"
  tools: Tool[],                 // 文件/bash 工具（自定义 + 权限守卫，见 3.2）
  customTools: ToolDefinition[], // xiaoa 专有工具（memory, knowledge）
  authStorage: AuthStorage,      // 认证适配（见 3.3）
  sessionManager?: SessionManager,
  resourceLoader?: ResourceLoader,
});
```

### AgentSession 公开 API

```typescript
session.subscribe(listener)        // 订阅 AgentSessionEvent
session.prompt(text, options?)     // 发送消息
session.steer(text, images?)       // 中途打断（立即）
session.followUp(text, images?)    // 追加后续任务
session.abort()                    // 中止执行
session.dispose()                  // 清理

session.state                      // AgentState（只读）
session.isStreaming                 // boolean
session.sessionFile                // JSONL 文件路径
session.messages                   // AgentMessage[]
```

### ToolDefinition 接口

```typescript
interface ToolDefinition<TParams, TDetails = unknown> {
  name: string;
  label: string;
  description: string;
  parameters: TParams;              // TypeBox schema
  execute(
    toolCallId: string,
    params: Static<TParams>,
    signal: AbortSignal | undefined,
    onUpdate: AgentToolUpdateCallback<TDetails> | undefined,
    ctx: ExtensionContext           // ← 含 ctx.ui.confirm() 权限对话
  ): Promise<AgentToolResult<TDetails>>;
}
```

### AgentSessionEvent 类型

```typescript
type AgentSessionEvent =
  | AgentEvent                             // pi-agent-core 标准事件
  | { type: "auto_compaction_start"; ... }
  | { type: "auto_compaction_end"; result: CompactionResult; ... }
  | { type: "auto_retry_start"; attempt: number; ... }
  | { type: "auto_retry_end"; success: boolean; ... };
```

---

## 3. 目录结构

```
src/
├── agent/                              # pi Agent 集成层（全新）
│   ├── index.ts                        # 公开 API
│   ├── types.ts                        # AgentMessage 声明合并
│   │
│   ├── workspace-session.ts            # createAgentSession() 封装
│   ├── global-session.ts               # Agent 封装（全局无项目 Agent）
│   │
│   ├── auth/
│   │   └── auth-bridge.ts              # AuthStorage + setFallbackResolver
│   │
│   ├── tools/
│   │   ├── index.ts                    # 组装所有工具
│   │   ├── file-tools.ts               # 权限感知的文件工具（含 ctx.ui.confirm）
│   │   ├── bash-tool.ts                # 权限感知的 bash 工具
│   │   ├── memory-tools.ts             # memory_search, memory_write
│   │   └── knowledge-tools.ts          # knowledge_read
│   │
│   ├── permission/
│   │   ├── permission-policy.ts        # 策略（explore/review/auto）
│   │   └── permission-request.ts       # ctx.ui 权限请求封装
│   │
│   └── run/
│       ├── run-types.ts                # ActiveRun 接口
│       ├── run-store.ts                # Map 状态（activeRuns, eventBuffers）
│       └── run-executor.ts             # AgentSessionEvent → ChatEvent 桥接
│
└── ipc/
    ├── chat/                           # 极薄 IPC 层（3 文件）
    │   ├── handlers.ts
    │   ├── schemas.ts
    │   └── index.ts
    │
    └── session/                        # 会话 IPC（替换 sisson/）
        ├── handlers.ts
        ├── schemas.ts
        └── index.ts
```

---

## 4. 工作区 Agent（workspace-session.ts）

```typescript
import { createAgentSession, AuthStorage } from "@mariozechner/pi-coding-agent";
import { buildAllTools } from "./tools/index";
import { createAuthBridge } from "./auth/auth-bridge";

export async function createWorkspaceSession(run: ActiveRun) {
  const { tools, customTools } = buildAllTools(run);

  const { session } = await createAgentSession({
    cwd: run.workspaceRootPath,
    agentDir: getXiaoaAgentDir(),    // ~/.xiaoa/agent/

    model: resolveModel(readConfig()),
    thinkingLevel: run.thinkingLevel ?? "minimal",

    tools,          // 文件/bash 工具（含权限逻辑）
    customTools,    // memory_search, knowledge_read

    authStorage: createAuthBridge(),
  });

  return session;
}
```

---

## 5. 认证适配（auth/auth-bridge.ts）

`AuthStorage` 是一个类，最简方案：创建内存实例 + `setFallbackResolver` 委托给 xiaoa 凭据。

```typescript
import { AuthStorage } from "@mariozechner/pi-coding-agent";
import { readCredentials } from "@/ipc/config/store";

export function createAuthBridge(): AuthStorage {
  const storage = AuthStorage.inMemory();

  // 从 xiaoa 加密凭据中按 provider 查找 API key
  storage.setFallbackResolver((provider: string) => {
    return readCredentials().providers[provider];
  });

  return storage;
}
```

---

## 6. 权限控制（tools/file-tools.ts 内部）

**结论**：无需 Extension——权限对话通过 `ToolDefinition.execute()` 的 `ctx.ui.confirm()` 实现。

```typescript
// tools/file-tools.ts
import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { getPermissionPolicy } from "../permission/permission-policy";

const writeSchema = Type.Object({
  path: Type.String({ description: "文件路径" }),
  content: Type.String({ description: "写入内容" }),
});

export function createFileWriteTool(run: ActiveRun): ToolDefinition<typeof writeSchema> {
  return {
    name: "file_write",
    label: "写入文件",
    description: "创建或覆写文件",
    parameters: writeSchema,
    execute: async (toolCallId, params, signal, onUpdate, ctx) => {
      const policy = getPermissionPolicy(run);

      if (policy !== "auto" && !isPermissionCached(run, "file_write", params.path)) {
        // 通过 ctx.ui.confirm 触发用户确认
        const allowed = await ctx.ui.confirm(
          "允许写入文件",
          `Agent 请求写入：${params.path}`
        );
        if (!allowed) throw new Error(`Permission denied: file_write ${params.path}`);
        cachePermission(run, "file_write", params.path);
      }

      // 执行实际写入
      await fs.writeFile(resolve(run.workspaceRootPath, params.path), params.content);
      return { content: [{ type: "text", text: `已写入 ${params.path}` }], details: { path: params.path } };
    },
  };
}
```

**Bash 工具** 同理：`execute` 内部检查命令风险级别，必要时调用 `ctx.ui.confirm()`。

**工具组装**（tools/index.ts）：

```typescript
export function buildAllTools(run: ActiveRun) {
  return {
    // tools: 文件/bash（含权限逻辑），传给 createAgentSession.tools
    tools: [
      createFileReadTool(run),
      createFileWriteTool(run),
      createFileListTool(run),
      createBashTool(run),
    ],
    // customTools: xiaoa 专有工具
    customTools: [
      ...createMemoryTools(run),
      ...createKnowledgeTools(run),
    ],
  };
}
```

---

## 7. 权限策略（permission/permission-policy.ts）

```typescript
type PermissionPolicy = "explore" | "review" | "auto";

export function getPermissionPolicy(run: ActiveRun): PermissionPolicy {
  if (!run.workspaceId) return "review";  // 全局 Agent 默认 review
  const workspace = readWorkspace(run.workspaceId);
  return workspace?.agent?.permissionPolicy ?? "review";
}

// 风险级别判断
export function getToolRisk(toolName: string, args: Record<string, unknown>): "low" | "medium" | "high" {
  if (toolName === "file_read" || toolName === "file_list") return "low";
  if (toolName === "file_write") return "medium";
  if (toolName === "bash") return isDestructiveCommand(String(args.command)) ? "high" : "medium";
  return "low";
}

// explore 模式：仅允许只读
export function isAllowedInPolicy(policy: PermissionPolicy, risk: string): boolean {
  if (policy === "auto") return true;
  if (policy === "explore") return risk === "low";
  return false;  // review: 全部需要确认
}
```

---

## 8. 运行时（run/run-executor.ts）

```typescript
export async function startChatRun(input: ChatSendInput): Promise<string> {
  const run = createActiveRun(input);
  activeRuns.set(run.key, run);
  appendEvent(run.key, { type: "run_start" });
  setImmediate(() => executeRun(run));
  return run.key;
}

async function executeRun(run: ActiveRun) {
  try {
    const session = run.scope === "workspace"
      ? await createWorkspaceSession(run)
      : await createGlobalSession(run);

    run.session = session;

    const unsubscribe = session.subscribe(event => bridgeEvent(run.key, event));

    try {
      await session.prompt(run.content);
    } finally {
      unsubscribe();
    }

    appendEvent(run.key, { type: "run_end" });
  } catch (error) {
    appendEvent(run.key, { type: "run_error", error: String(error) });
  } finally {
    activeRuns.delete(run.key);
  }
}

// AgentSessionEvent → ChatEvent
function bridgeEvent(key: string, event: AgentSessionEvent) {
  switch (event.type) {
    case "message_update":
      appendEvent(key, { type: "message_delta", delta: extractDelta(event) });
      break;
    case "message_end":
      appendEvent(key, { type: "message_end", content: extractContent(event) });
      break;
    case "tool_execution_start":
      appendEvent(key, { type: "tool_start", toolName: event.toolName, args: event.args });
      break;
    case "tool_execution_end":
      appendEvent(key, { type: "tool_end", toolName: event.toolName, isError: event.isError });
      break;
    case "auto_compaction_end":
      appendEvent(key, { type: "compaction_done" });  // 可选：通知 UI
      break;
  }
}
```

---

## 9. 全局 Agent（global-session.ts）

全局 Agent（无项目目录）使用 `@mariozechner/pi-agent-core` 直接：

```typescript
import { Agent } from "@mariozechner/pi-agent-core";

export function createGlobalSession(run: ActiveRun): Agent {
  return new Agent({
    initialState: {
      systemPrompt: buildGlobalSystemPrompt(run),
      model: resolveModel(readConfig()),
      tools: [
        ...createMemoryTools(run),
        ...createKnowledgeTools(run),
      ],
      messages: [],
      thinkingLevel: "minimal",
    },
    convertToLlm: filterToLlmMessages,
    getApiKey: (provider) => readCredentials().providers[provider],
  });
}
```

---

## 10. 会话 IPC（ipc/session/）

替换 `src/ipc/sisson/`，直接读 pi SessionManager 数据：

```typescript
// ipc/session/handlers.ts
export const list = os.input(listSessionsSchema).handler(async ({ input }) => {
  const dir = getSessionsDir(input);  // ~/.xiaoa/agent/sessions/<encoded-cwd>/
  const files = await fs.readdir(dir).catch(() => []);
  return files.map(parseSessionFileMeta);  // 从文件名解析 id/timestamp
});

export const getMessages = os.input(getSessionMessagesSchema).handler(async ({ input }) => {
  // 读取 JSONL 文件，过滤出 type: "message" 条目，重建消息列表
  const entries = await readSessionFile(input.sessionFilePath);
  return buildMessageList(entries);  // 处理 compaction 分支
});
```

---

## 11. Skill 系统（文件发现）

**存储路径**：`~/.xiaoa/agent/skills/<name>/SKILL.md`

**SKILL.md 格式**：

```markdown
---
description: "代码审查：检查安全性、性能、可读性"
---

# 代码审查

## 步骤
1. 用 read 工具读取目标文件
2. 检查维度：...
```

pi ResourceLoader 在 `createAgentSession()` 时自动发现并注入 System Prompt XML，零配置。

**xiaoa Skill 管理 UI** 改为文件操作（`src/ipc/skill/store.ts` 重写）：

- `createSkill()` → `fs.mkdir + fs.writeFile`
- `updateSkill()` → `fs.writeFile`
- `deleteSkill()` → `fs.rm`
- `listSkills()` → `fs.readdir`

---

## 12. 自定义消息类型（声明合并）

```typescript
// src/agent/types.ts
declare module "@mariozechner/pi-agent-core" {
  interface CustomAgentMessages {
    // pi-coding-agent 内置（已有）
    bash_execution: BashExecutionMessage;
    compaction_summary: CompactionSummaryMessage;

    // xiaoa 追加（UI 时间线用，LLM 不可见）
    permission_request: PermissionRequestMessage;
    memory_update: MemoryUpdateMessage;
  }
}
```

**convertToLlm**（src/agent/convert-to-llm.ts）：

- `permission_request` / `memory_update` → 过滤（不传给 LLM）
- `compaction_summary` → pi-coding-agent 内部处理
- 标准 `user/assistant/toolResult` → 直接透传

---

## 13. pi-web-ui 集成策略

`@mariozechner/pi-web-ui` 是 **LitElement Web Components**（非 React 组件），基于 mini-lit + Tailwind v4。

### 架构约束

pi-web-ui 的 `ChatPanel`/`AgentInterface` 期望直接持有 `Agent` 实例：

```typescript
chatPanel.setAgent(agent, { toolsFactory, onApiKeyRequired })
```

但 xiaoa 的 Agent 运行在 **Main 进程**（Node.js + 文件系统），无法传递给 Renderer。因此 **不采用全量 ChatPanel 替换**，而是**选择性集成**。

### 集成方案

**用 pi-web-ui 替换**：

| 组件 | pi-web-ui 替换方案 |
|------|-------------------|
| `message-list.tsx` | `<message-list>` Web Component（含内置 tool/thinking 渲染） |
| 工具执行展示 | `registerToolRenderer()` 注册 file/bash 自定义渲染器 |
| 模型选择对话框 | `ModelSelector.open()` 静态方法 |
| Provider 设置 | `SettingsDialog.open([new ApiKeysTab(), new ProvidersModelsTab()])` |
| 制品渲染（未来） | `<artifacts-panel>` + `ArtifactsPanel.tool` |

**保留 xiaoa 自定义**：

| 组件 | 原因 |
|------|------|
| `message-input.tsx` | 含 `/` 技能菜单、`@` 文件菜单，IPC 对接 |
| `session-list.tsx` | 连接 pi SessionManager JSONL，非 pi-web-ui SessionsStore |
| `permission-dialog.tsx` | 与 xiaoa 权限 IPC 对接 |
| 整体布局/路由 | React + TanStack Router 应用结构 |

### CSS 策略

pi-web-ui 组件使用 Shadow DOM 样式隔离，内部样式不会泄漏。但需导入全局 CSS：

```typescript
// src/renderer.ts 或 src/styles/globals.css
import '@mariozechner/pi-web-ui/app.css';
```

注意：两者都用 Tailwind v4，全局 CSS 在 Shadow DOM 外层可能有冲突。建议将 pi-web-ui CSS 作用域限定在 `.pi-ui` 包装容器内（若出现冲突时处理）。

---

## 14. 依赖（已安装）

```json
"@mariozechner/pi-agent-core": "^0.53.0",   // ✅
"@mariozechner/pi-ai": "^0.53.0",            // ✅
"@mariozechner/pi-coding-agent": "^0.53.0",  // ✅
"@mariozechner/pi-web-ui": "^0.53.0"         // ✅
```

---

## 15. 不需要改动的部分

| 模块 | 原因 |
|------|------|
| `src/ipc/memory/` | Daily Log + MEMORY.md，memory-tools 依赖 |
| `src/ipc/knowledge/` | 知识库，knowledge-tools 依赖 |
| `src/ipc/workspace/` | 工作区配置，权限策略读取依赖 |
| `src/ipc/manager.ts`、`router.ts` | IPC 传输层 |
| `src/components/chat/permission-dialog.tsx` | 与新权限桥接兼容 |
| `src/components/chat/message-input.tsx` | 无需改动 |
| `src/components/chat/skill-menu.tsx` | 无需改动 |
| `src/ipc/skill/` | Phase 4 后更新 |

---

## 16. UI 层规划（含 pi-web-ui 集成）

### 16.1 UI 变更总览

| 组件/文件 | 状态 | 说明 |
|-----------|------|------|
| `src/components/chat/chat-view.tsx` | 小改 | 使用 `<PiMessageList>` wrapper |
| `src/components/chat/message-list.tsx` | **替换** | 改为 pi-web-ui `<message-list>` 的 React wrapper |
| `src/components/chat/message-input.tsx` | 不变 | 技能菜单保留 |
| `src/components/chat/permission-dialog.tsx` | 不变 | 权限机制保持 |
| `src/components/chat/session-list.tsx` | **更新** | 适配新 session IPC |
| `src/components/chat/pi-message-list.tsx` | **新建** | React 19 封装 `<message-list>` |
| `src/components/chat/tool-renderers.ts` | **新建** | 注册 file/bash 自定义渲染器 |
| `src/actions/chat.ts` | **扩展** | 新增 ChatEvent 类型 |
| `src/routes/index.tsx` | **更新** | AgentMessage[] 状态重建 |
| `src/renderer.ts` | **更新** | 导入 pi-web-ui CSS |

### 16.2 消息格式统一：AgentMessage[]

**核心变化**：Renderer 持有 `AgentMessage[]`（pi 格式），直接传给 `<message-list>`。

**数据来源**：

1. **历史消息**：通过新 `session.getMessages` IPC 读取 JSONL，返回 `AgentMessage[]`
2. **流式期间**：从 ChatEvent 动态重建 in-flight `AgentMessage`

```typescript
// src/routes/index.tsx 中的状态重建
const [messages, setMessages] = useState<AgentMessage[]>([]);
const [streamingMsg, setStreamingMsg] = useState<AgentMessage | null>(null);

// applyHomeChatEvent
case "message_start":
  setStreamingMsg({ role: "assistant", content: "", timestamp: Date.now() });
  break;
case "message_delta":
  setStreamingMsg(prev => prev ? { ...prev, content: prev.content + event.delta } : null);
  break;
case "message_end":
  setMessages(prev => [...prev, { role: "assistant", content: event.content, ... }]);
  setStreamingMsg(null);
  break;
case "tool_call":
  setMessages(prev => [...prev, {
    role: "tool_call",
    toolCallId: event.toolCallId,
    toolName: event.toolName,
    args: JSON.parse(event.args),
    timestamp: Date.now(),
  }]);
  break;
case "tool_result":
  // 更新对应 tool_call 条目的 result
  setMessages(prev => prev.map(m =>
    m.role === "tool_call" && m.toolCallId === event.toolCallId
      ? { ...m, result: event.content, isError: event.isError }
      : m
  ));
  break;
case "compaction":
  setMessages(prev => [...prev, {
    role: "compaction_summary",
    messagesBefore: event.messagesBefore,
    messagesAfter: event.messagesAfter,
  }]);
  break;
```

### 16.3 MessageList React Wrapper（pi-message-list.tsx）

React 19 支持 Web Components，但 object/function props 需要 ref 命令式赋值：

```typescript
// src/components/chat/pi-message-list.tsx
import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { AgentMessage } from "@mariozechner/pi-agent-core";

// 声明 JSX 类型
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "message-list": React.HTMLAttributes<HTMLElement>;
    }
  }
}

interface PiMessageListProps {
  messages: AgentMessage[];
  streamingMessage?: AgentMessage | null;
  tools?: AgentTool[];
  isStreaming?: boolean;
}

export function PiMessageList({ messages, streamingMessage, tools = [], isStreaming = false }: PiMessageListProps) {
  const ref = useRef<HTMLElement & {
    messages: AgentMessage[];
    tools: AgentTool[];
    isStreaming: boolean;
    pendingToolCalls?: Set<string>;
  }>(null);

  // 合并 messages + in-flight streaming message
  const allMessages = streamingMessage ? [...messages, streamingMessage] : messages;

  useLayoutEffect(() => {
    if (!ref.current) return;
    ref.current.messages = allMessages;
    ref.current.tools = tools;
    ref.current.isStreaming = isStreaming;
  }, [allMessages, tools, isStreaming]);

  return <message-list ref={ref} class="flex-1 overflow-y-auto" />;
}
```

### 16.4 工具渲染器注册（tool-renderers.ts）

在应用启动时注册 xiaoa 专属工具的自定义渲染器：

```typescript
// src/components/chat/tool-renderers.ts
import { registerToolRenderer } from "@mariozechner/pi-web-ui";
import { html } from "lit";

export function registerXiaoaToolRenderers() {
  // file_write 工具：显示文件路径和内容摘要
  registerToolRenderer("file_write", {
    render(params, result, isStreaming) {
      return {
        isCustom: true,
        content: html`
          <div class="tool-file-write">
            <span class="icon">📝</span>
            <span class="path">${params?.path}</span>
            ${result && !isStreaming
              ? html`<span class="status ${result.isError ? "error" : "ok"}">
                  ${result.isError ? "✗ 失败" : "✓ 已写入"}
                </span>`
              : html`<span class="status running">写入中…</span>`}
          </div>
        `,
      };
    },
  });

  // bash 工具：命令 + 输出（折叠）
  registerToolRenderer("bash", {
    render(params, result, isStreaming) {
      return {
        isCustom: true,
        content: html`
          <div class="tool-bash">
            <span class="icon">⚡</span>
            <code class="command">${params?.command}</code>
            ${result?.content ? html`
              <details>
                <summary>${result.isError ? "错误输出" : "输出"}</summary>
                <pre>${result.content}</pre>
              </details>
            ` : ""}
          </div>
        `,
      };
    },
  });
}
```

**在 `src/renderer.ts` 初始化时调用**：

```typescript
import { registerXiaoaToolRenderers } from "@/components/chat/tool-renderers";
import "@mariozechner/pi-web-ui/app.css";

registerXiaoaToolRenderers();
```

### 16.5 ModelSelector 集成

替换现有的模型下拉为 pi-web-ui 的 `ModelSelector` 对话框：

```typescript
// src/components/chat/message-input.tsx 中（或设置页）
import { ModelSelector } from "@mariozechner/pi-web-ui";

async function handleModelClick() {
  await ModelSelector.open(currentModel, (model) => {
    updateConfig({ model: model.id });
  });
}
```

### 16.6 SettingsDialog 集成

替换 Provider 设置 UI：

```typescript
// src/routes/settings.tsx 或设置按钮点击
import { SettingsDialog, ApiKeysTab, ProvidersModelsTab } from "@mariozechner/pi-web-ui";

async function handleSettingsClick() {
  await SettingsDialog.open([new ApiKeysTab(), new ProvidersModelsTab()]);
}
```

**注意**：pi-web-ui 的 ApiKeysTab 使用自己的 IndexedDB 存储（`ProviderKeysStore`），而 xiaoa 使用 `src/ipc/config/store.ts` 加密存储。需要选择其中一种：

- **推荐（简单）**：用 pi-web-ui 的 `ProviderKeysStore`，弃用 xiaoa 的加密存储（配置存储和凭据合并）
- **备选（完整桥接）**：自定义 `StorageBackend` 实现，桥接到 xiaoa 的 IPC 存储

### 16.7 ChatEvent Schema 扩展

新增事件类型（`src/ipc/chat/schemas.ts`）：

```typescript
| { type: "tool_call";    toolCallId: string; toolName: string; args: string }
| { type: "tool_result";  toolCallId: string; toolName: string; isError: boolean; content: string }
| { type: "compaction";   messagesBefore: number; messagesAfter: number }
```

### 16.8 会话列表适配（session-list.tsx）

数据结构对比：

| 字段 | 旧 (Sisson) | 新 (pi Session JSONL) |
|------|-------------|----------------------|
| id | UUID | 文件路径（路由 key）|
| title | 显式存储 | 首条 user message 截取 |
| createdAt | 数据库字段 | JSONL 文件 mtime |
| messageCount | 数据库字段 | 解析 JSONL 计数 |

### 16.9 ArtifactsPanel（未来扩展）

`<artifacts-panel>` 允许 AI 生成交互式 HTML/SVG/Markdown 制品。

**Phase 6 后**：在 `chat-view.tsx` 中加入可折叠的 `<artifacts-panel>`，为 Agent 添加 `ArtifactsPanel.tool`，实现 AI 生成可视化制品（图表、交互应用）。

---

## 17. 权限对话桥接

`ctx.ui.confirm()` 在 pi-coding-agent 内部是 Extension 层注入的对话机制。xiaoa 需要自定义 UI：

**桥接方案**（`src/agent/permission/permission-request.ts`）：

在自定义工具的 `execute()` 内部，绕过 `ctx.ui.confirm()`，改用 Promise + IPC：

```typescript
// 1. 发射 permission_request ChatEvent（非阻塞）
appendEvent(runKey, { type: "permission_request", permissionId, ...details });

// 2. 挂起等待用户响应（阻塞工具执行）
const allowed = await waitForPermissionResponse(runKey, permissionId);
// waitForPermissionResponse 返回 Promise，由 respondChatPermission IPC 来 resolve
```

Renderer 接收事件 → 显示 `PermissionDialog` → 用户点击 → 调用 `respondChatPermission` → Main 进程 resolve → 工具继续。

---

## 18. 路线图

### Phase 1：核心骨架 + 基础消息渲染

**后端**：

- 新建 `src/agent/` 目录骨架
- `src/agent/run/run-types.ts`（ActiveRun 接口）
- `src/agent/run/run-store.ts`（事件缓冲）
- `src/agent/run/run-executor.ts`（AgentSessionEvent → ChatEvent 桥接）
- `src/agent/auth/auth-bridge.ts`
- `src/agent/workspace-session.ts`
- `src/agent/global-session.ts`
- 更新 `src/ipc/chat/` 为极薄 IPC 层

**前端**：

- 导入 `@mariozechner/pi-web-ui/app.css`
- 新建 `src/components/chat/pi-message-list.tsx`（Web Component wrapper）
- 新建 `src/components/chat/tool-renderers.ts`（注册 file/bash 渲染器）
- 更新 `src/ipc/chat/schemas.ts`（tool_call / tool_result / compaction）
- 更新 `src/routes/index.tsx`（AgentMessage[] 状态重建 + PiMessageList）

**验证**：对话中能看到工具调用条目（pi-web-ui 渲染）

### Phase 2：权限守卫 UI

- `src/agent/permission/` 模块
- `src/agent/tools/` 文件工具 + bash 工具（含权限逻辑）
- PermissionDialog 机制保持

### Phase 3：会话 IPC + 会话列表

- `src/ipc/session/` 替换 `sisson/`
- 会话列表适配新 IPC
- 新建 `src/actions/session.ts`

### Phase 4：Skill 系统迁移

- `src/ipc/skill/store.ts` → 文件操作

### Phase 5：全局 Agent + Provider 设置

- `src/agent/global-session.ts` 完善
- 集成 `ModelSelector` + `SettingsDialog`

### Phase 6：ArtifactsPanel + 会话分支 UI

- `<artifacts-panel>` 集成
- SessionManager 分支能力 → 会话树可视化
