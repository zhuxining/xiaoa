# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

小 A 是一个为非Coding群体打造的Agent工作站。基于[@mariozechner/pi-agent-core](https://github.com/badlogic/pi-mono.git)的基础能力与设计原则，参考[craft-agents-oss](https://github.com/lukilabs/craft-agents-oss.git)项目架构设计。

**技术栈**: Electron + React 19 | TailwindCSS 4 + shadcn/ui | Jotai | Bun monorepos

## 快速导航

- Electron 主进程: `apps/electron/src/main/`
- Preload: `apps/electron/src/preload/`
- Renderer (React): `apps/electron/src/renderer/`
- 共享类型: `packages/types/src/`
- 共享工具: `packages/shared/src/`
- UI 组件库: `packages/ui/src/`

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
│   ├── ui/                    # @xiaoa/ui - UI 组件库 (shadcn/ui + 主题)
│   │   ├── src/
│   │   │   ├── components/ui/ # shadcn/ui 组件
│   │   │   ├── lib/utils.ts   # cn() 工具函数
│   │   │   └── styles/        # 主题 CSS 变量
│   │   └── components.json    # shadcn/ui 配置
│   ├── types/                 # @xiaoa/types - IPC 通道 & API 类型
│   └── shared/                # @xiaoa/shared - 非 UI 共享工具
├── biome.json                 # 代码格式化 & Lint
└── tsconfig.json              # 根 TS 配置 (project references)
```

**关键目录**:

- `apps/electron/src/main/` - Electron 主进程，窗口管理和 IPC 处理
- `apps/electron/src/renderer/` - React 应用，Vite 作为构建工具
- `packages/types/` - 跨进程共享的类型定义

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
- **构建**: Main & Preload 用 esbuild 打包为 CJS，Renderer 用 Vite 构建
- **IPC 通信**: 通过 `@xiaoa/types` 定义通道常量，Preload 通过 contextBridge 暴露 API
- **状态管理**: Jotai (原子化状态)
- **UI 组件**: shadcn/ui (New York 风格) + TailwindCSS 4

## 代码规范

### 格式化 (Biome)

- Tab 缩进，行宽 100
- 无分号（ASI）
- 运行 `bun run check` 检查

### 导入规范

- UI 组件和 `cn()` 从 `@xiaoa/ui` 导入
- 主题 CSS 通过 `@import "@xiaoa/ui/styles"` 引入
- 使用 `@xiaoa/types` 和 `@xiaoa/shared` workspace 包共享代码
- Renderer 内使用 `@/` 别名指向 `src/renderer/`

## 反模式和注意事项

### 不要做

- 不要在 Renderer 中直接使用 Node.js API，通过 Preload 暴露
- 不要绕过 contextBridge，保持 contextIsolation: true
- 不要在根目录添加应用级依赖，依赖应放在对应的 workspace 包中

### 常见陷阱

- Main/Preload 构建为 CJS 格式 (.cjs)，注意 import 语法会被 esbuild 转换
- Vite dev server 在 5173 端口，开发模式下 Electron 加载此 URL

## Git 工作流

- 主分支: `main`
- 开发分支: `dev`

## 开发提示

- 添加 shadcn/ui 组件: 在 `packages/ui/` 目录下运行 `npx shadcn@latest add <component>`
- IPC 通道: 先在 `packages/types/src/ipc.ts` 定义常量，再在 main/preload 中使用

## 相关资源

- [craft-agents-oss](https://github.com/lukilabs/craft-agents-oss.git)
- [pi](https://github.com/badlogic/pi-mono.git)
