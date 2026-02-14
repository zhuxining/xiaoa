# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

小 A 是一个为非Coding群体打造的Agent工作站。基于`@mariozechner/pi-agent-core`sdk的Agent基础集成能力，参考 `craft-agents-oss` 的产品设计。

**技术栈**: Electron Forge + React 19 | TailwindCSS 4 + shadcn/ui | TanStack Router + Query | oRPC | pi-agent-core + pi-ai
**设计文档**: 架构设计文档位于 `docs/design/architecture.md`，包含详细的设计决策和架构图。

## 项目结构

```text
xiaoa/
└── src/
    ├── actions/         # 客户端 IPC 调用封装（Renderer → Main）
    ├── components/      # React 组件
    │   └── ui/          # shadcn/ui 组件
    ├── constants/       # 常量
    ├── ipc/             # oRPC handlers（Main 进程）
    │   ├── app/         # 应用信息
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

## Agent SDK（pi-agent-core）

小A的 Agent 能力基于 `@mariozechner/pi-agent-core`（[pi-mono](https://github.com/badlogic/pi-mono)）。核心概念：

- **Agent 类**: 有状态的 Agent 循环，在 Main 进程中运行。通过 `agent.prompt()` 发起对话，`agent.subscribe()` 监听事件流
- **AgentTool**: 工具定义接口，`execute` 返回 `{ content, details }`
- **AgentMessage**: 可通过 declaration merging 扩展的消息联合类型。自定义消息在 `convertToLlm` 中过滤/转换
- **convertToLlm**: 将 AgentMessage（含自定义类型）转为 LLM 可消费的 Message[]，每次 LLM 调用前执行
- **transformContext**: 上下文变换钩子，每次 LLM 调用前执行。用于 context 裁剪、记忆注入、Pre-compaction flush
- **getApiKey**: 按 Provider 获取 API Key 的异步回调
- **Steering / Follow-up**: 工具执行期间打断（steering）或完成后追加任务（follow-up）的队列机制
- **事件流**: `AgentEvent` 包含 agent/turn/message/tool_execution 的 start/update/end 事件

**关键代码模式**：

```typescript
// 工具定义（TypeBox，非 Zod）
import { Type } from "@sinclair/typebox";
const schema = Type.Object({ query: Type.String({ description: "..." }) });

// Agent 实例化
const agent = new Agent({
  initialState: { systemPrompt, model: getModel(provider, modelId), tools, messages: [] },
  convertToLlm, transformContext, getApiKey,
});

// 发送消息 + 监听事件
agent.subscribe((event) => { /* handle AgentEvent */ });
await agent.prompt("Hello");
```

## 反模式

- **不要使用传统 `ipcMain.handle` / `ipcRenderer.invoke`** — 所有 IPC 通信通过 oRPC router 实现。
- **不要引入全局状态库（Redux / Jotai / Zustand）** — 服务端状态用 TanStack Query，局部状态用 `useState`。
- **不要手写路由配置** — 使用 TanStack Router 文件路由约定，路由文件放在 `src/routes/` 下。
- **不要使用 IPC 通道字符串常量** — oRPC 提供端到端类型安全，按 `router.domain.procedure()` 调用。
- **不要在 Renderer 进程直接调用 LLM API** — Agent 运行在 Main 进程，Renderer 通过 oRPC `chat.send` / `chat.abort` 交互。
- **不要将全部记忆注入 System Prompt** — 仅注入 MEMORY.md，Daily Log 通过 `memory_search` 工具按需检索。

## 相关资源

- [产品设计参考](https://github.com/lukilabs/craft-agents-oss)
- [pi-mono 仓库](https://github.com/badlogic/pi-mono) — Agent SDK 源码
  - `packages/agent` — pi-agent-core 核心（Agent 类、agentLoop、类型定义）
  - `packages/ai` — pi-ai LLM 抽象（Model、Message、streamSimple、Provider 注册表）
  - `packages/coding-agent` — 完整 Agent 实现参考（工具定义、System Prompt 组装、Compaction、convertToLlm）
  - `packages/web-ui` — Web UI 组件参考（AgentInterface、事件订阅、自定义消息渲染）
