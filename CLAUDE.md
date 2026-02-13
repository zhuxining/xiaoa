# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

小 A 是一个为非Coding群体打造的Agent工作站。基于`@mariozechner/pi-agent-core`的基础能力与设计原则，参考 [craft-agents-oss](references/craft-agents-oss) 项目架构设计。

**技术栈**: Electron + React 19 | TailwindCSS 4 + Base UI | Jotai | Bun monorepos
**设计文档**: 架构设计文档位于 `docs/design/Architecture.md`，包含详细的设计决策和架构图。

## 子包文档

各子包有独立的 CLAUDE.md，包含领域专属指导：

- `apps/electron/CLAUDE.md` - Electron 应用架构与 IPC 模式
- `packages/ui/CLAUDE.md` - UI 组件库与主题系统
- `packages/types/CLAUDE.md` - 类型定义与 IPC 通道规范
- `packages/shared/CLAUDE.md` - 共享工具与职责边界

## 项目结构

```text
xiaoa/
├── apps/
│   └── electron/              # Electron 桌面应用
│       ├── src/
│       │   ├── main/          # 主进程 (Node.js)
│       │   ├── preload/       # 预加载脚本 (contextBridge)
│       │   ├── renderer/      # React 渲染进程 (Vite)
│       │   └── shared/        # 本地类型重导出
│       └── vite.config.ts     # Renderer 构建配置
├── packages/
│   ├── ui/                    # @xiaoa/ui - UI 组件库 (Base UI + 主题)
│   │   ├── src/
│   │   │   ├── components/    # 基于 Base UI 的样式化组件
│   │   │   ├── lib/utils.ts   # cn() 工具函数
│   │   │   └── styles/        # 主题 CSS 变量
│   ├── types/                 # @xiaoa/types - IPC 通道 & API 类型
│   └── shared/                # @xiaoa/shared - 非 UI 共享工具
├── biome.json                 # 代码格式化 & Lint
└── tsconfig.json              # 根 TS 配置 (project references)
```

## 常用开发命令

### 开发和构建

```bash
bun run dev          # 启动开发模式 (Vite + Electron)
bun run build        # 生产构建
bun run start        # 构建并启动
```

### 代码质量

```bash
bun run check        # Biome 代码检查
bun run check-types  # TypeScript 类型检查
```

## 架构概览

- **三进程架构**: Main (Node.js) / Preload (contextBridge) / Renderer (React)
- **构建**: Electron Forge + Vite，详见 `apps/electron/CLAUDE.md`
- **IPC 通信**: 通过 `@xiaoa/types` 定义通道常量，详见 `packages/types/CLAUDE.md`
- **状态管理**: Jotai (原子化状态)
- **UI 组件**: Base UI (无样式原语) + TailwindCSS 4

## 导入规范

- UI 组件和 `cn()` 从 `@xiaoa/ui` 导入
- Base UI 原语直接从 `@base-ui/react/<component>` 导入
- 主题 CSS 通过 `@import "@xiaoa/ui/styles"` 引入
- 使用 `@xiaoa/types` 和 `@xiaoa/shared` workspace 包共享代码
- Renderer 内使用 `@/` 别名指向 `src/renderer/`

## 反模式

- 不要在根目录添加应用级依赖，依赖应放在对应的 workspace 包中

## 相关资源

- [craft-agents-oss](references/craft-agents-oss) — 项目架构参考
- [pi-agent](references/pi-mono) — 基础能力参考
