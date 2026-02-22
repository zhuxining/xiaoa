# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

小 A 是一个为非Coding群体打造的Agent工作站。完全基于 `@mariozechner/pi-coding-agent` 高层封装，参考 `craft-agents-oss` 的产品设计。

**技术栈**: Electron Forge + React 19 | TailwindCSS 4 + shadcn/ui | TanStack Router + Query | oRPC | pi-coding-agent + pi-ai
**Schema 说明**: oRPC IPC 输入验证使用 **Zod 4**；自定义 Agent 工具参数（`ToolDefinition`）使用 **TypeBox**（`@sinclair/typebox`，作为传递依赖自动安装，无需显式安装）
**设计文档**: 架构设计文档位于 `docs/design/architecture.md`，包含详细的设计决策和架构图。

## 项目结构

```text
xiaoa/
└── src/
    ├── agent/           # pi-coding-agent 集成层（Main 进程）
    │   ├── workspace-session.ts   # createAgentSession() 封装
    │   ├── extension-factory.ts   # createXiaoaExtension()（系统提示 + 权限钩子）
    │   ├── system-prompt.ts       # 系统提示组装
    │   ├── auth/        # AuthStorage 适配
    │   ├── tools/       # 自定义 ToolDefinition（memory / knowledge）
    │   └── run/         # ActiveRun 状态 + 事件桥接
    ├── actions/         # 客户端 IPC 调用封装（Renderer → Main）
    ├── components/      # React 组件
    │   └── ui/          # shadcn/ui 组件
    ├── constants/       # 常量
    ├── ipc/             # oRPC handlers（Main 进程）
    │   ├── app/         # 应用信息
    │   ├── chat/        # 对话 IPC（极薄，3 文件）
    │   ├── session/     # 会话管理
    │   ├── shell/       # Shell 操作
    │   ├── theme/       # 主题管理
    │   └── window/      # 窗口控制
    ├── layouts/         # 布局组件
    ├── localization/    # i18n 配置（i18next）
    ├── routes/          # TanStack Router 文件路由
    ├── styles/          # 全局样式
    ├── tests/           # 测试
    ├── types/           # 类型定义
    └── utils/           # 工具函数
```

## 常用开发命令

```sh
bun run start        # Start the app in development mode
bun run package      # Package the app into an executable bundle
bun run make         # Generate platform-specific distributables (.exe, .dmg, etc.)
bun run publish      # Publish the app to configured publishers
bun run check        # Run Ultracite to check code quality
bun run fix          # Run Ultracite to fix code issues
bun run check-types  # Run tsgo type checking
bun run bump-ui      # Update shadcn-ui components
bun run clean        # Clean cache
bun run test         # Run unit tests with Vitest
bun run test:watch   # Run Vitest in watch mode
bun run test:unit    # Run unit tests with Vitest (interactive)
bun run test:e2e     # Run end-to-end tests with Playwright
bun run test:all     # Run both unit and E2E tests
```

## 架构概览

- **IPC 通信**: 使用 oRPC 实现 Main ↔ Renderer 类型安全通信，通过 MessagePort 传输。IPC handlers 按领域组织在 `src/ipc/` 下，客户端调用封装在 `src/actions/` 下。
- **路由**: 使用 TanStack Router 文件路由（`src/routes/`），`__root.tsx` 为根路由，各页面为独立路由文件。
- **状态管理**: 服务端状态使用 TanStack Query（`useQuery` / `useMutation`），导航状态由 TanStack Router 管理，UI 局部状态使用 `useState`。
- **国际化**: 使用 i18next，配置在 `src/localization/`。
- **代码质量**: Biome（lint/format） + tsgo（类型检查） + React Compiler。

## Agent SDK（pi-coding-agent）

小A的 Agent 能力完全基于 `@mariozechner/pi-coding-agent`（[pi-mono](https://github.com/badlogic/pi-mono)）。核心概念：

- **createAgentSession**: 主入口，创建 `AgentSession`，自动处理 Compaction、SessionManager、ResourceLoader
- **DefaultResourceLoader**: 加载技能（`agentDir/skills/`）、上下文文件、系统提示；支持 `systemPromptOverride`、`agentsFilesOverride`、`extensionFactories`
- **ExtensionFactory**: `(pi: ExtensionAPI) => void`，用于注册 `before_agent_start` / `tool_call` 等钩子
- **before_agent_start**: 每轮 LLM 调用前触发，可返回 `{ systemPrompt }` 动态替换提示
- **tool_call**: 工具调用前触发，可返回 `{ block: true, reason }` 阻止执行（权限控制入口）
- **SessionManager.open(path)**: 加载指定路径的 JSONL 会话文件（深度集成自定义路径）
- **Tool[]**: pi 内置工具选择器（`readTool, bashTool, editTool, writeTool, grepTool` 等）
- **ToolDefinition**: 自定义工具接口，`execute(toolCallId, params, signal, onUpdate, ctx)` 签名
- **agentSession.messages**: 获取当前会话所有消息，用于 UI 渲染
- **AgentSessionEvent**: 事件类型包含 `message_update/end`、`tool_execution_start/end`、`auto_compaction_start/end`、`auto_retry_start/end`

**关键代码模式**：

```typescript
// 自定义工具定义（TypeBox，非 Zod）
import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";

const myTool: ToolDefinition<typeof schema> = {
  name: "my_tool",
  label: "工具名称",
  description: "工具描述",
  inputSchema: Type.Object({ query: Type.String() }),
  execute: async (toolCallId, params, signal, onUpdate, ctx) => {
    return { content: "结果", details: {} };
  },
};

// Extension 工厂（系统提示 + 权限钩子）
const extension: ExtensionFactory = (pi) => {
  pi.on("before_agent_start", async () => ({ systemPrompt: "..." }));
  pi.on("tool_call", async (event) => {
    if (shouldBlock(event)) return { block: true, reason: "权限不足" };
  });
};

// 创建会话
const session = await createAgentSession({
  cwd, agentDir, model, thinkingLevel,
  tools: [readTool, bashTool, editTool, writeTool],  // pi 内置 Tool[]
  customTools: [myTool],                             // 自定义 ToolDefinition[]
  resourceLoader: new DefaultResourceLoader({ agentDir, extensionFactories: [extension] }),
  sessionManager: SessionManager.open(sessionFilePath),
  authStorage,
});

// 发送消息 + 监听事件
session.subscribe((event) => { /* handle AgentSessionEvent */ });
await session.send("Hello");
```

## 反模式

- **不要使用传统 `ipcMain.handle` / `ipcRenderer.invoke`** — 所有 IPC 通信通过 oRPC router 实现。
- **不要引入全局状态库（Redux / Jotai / Zustand）** — 服务端状态用 TanStack Query，局部状态用 `useState`。
- **不要手写路由配置** — 使用 TanStack Router 文件路由约定，路由文件放在 `src/routes/` 下。
- **不要使用 IPC 通道字符串常量** — oRPC 提供端到端类型安全，按 `router.domain.procedure()` 调用。
- **不要在 Renderer 进程直接调用 LLM API** — Agent 运行在 Main 进程，Renderer 通过 oRPC `chat.send` / `chat.abort` 交互。
- **不要将全部记忆注入 System Prompt** — 仅注入 MEMORY.md（通过 `agentsFilesOverride`），Daily Log 通过 `memory_search` 工具按需检索。
- **不要自己实现文件/bash 工具** — 使用 pi 内置的 `readTool / bashTool / editTool / writeTool / grepTool`，通过 `tool_call` 钩子控制权限。
- **不要在工具 execute() 内嵌权限逻辑** — 权限判断统一在 `extension-factory.ts` 的 `tool_call` 钩子中处理。
- **不要手动实现 Compaction** — pi-coding-agent 自动处理上下文压缩，无需手写 `transformContext`。

## 相关资源

- [产品设计参考](https://github.com/lukilabs/craft-agents-oss)
- [pi-mono 仓库](https://github.com/badlogic/pi-mono) — Agent SDK 源码
  - `packages/coding-agent` — pi-coding-agent（createAgentSession、DefaultResourceLoader、SessionManager、Extension 系统）
  - `packages/agent` — pi-agent-core 底层（Agent 类、类型定义，pi-coding-agent 的依赖）
  - `packages/ai` — pi-ai LLM 抽象（Model、getModel、Provider 注册表）
