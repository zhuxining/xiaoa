# Electron 应用

桌面应用入口，基于 Electron Forge + Vite 构建。

## 三进程架构

| 进程 | 目录 | 运行环境 | 构建工具 |
|------|------|----------|----------|
| Main | src/main/ | Node.js | Vite (CJS 输出) |
| Preload | src/preload/ | 受限 Node.js | Vite (CJS 输出) |
| Renderer | src/renderer/ | 浏览器 | Vite (ESM 输出) |

## IPC 通信流程

新增 IPC 通道的完整步骤：

1. `packages/types/src/ipc.ts` → 添加通道常量到 IPC_CHANNELS
2. `packages/types/src/electron.ts` → 添加方法到 ElectronAPI 接口
3. `src/main/ipc.ts` → 注册 ipcMain.handle 处理函数
4. `src/preload/preload.ts` → 通过 contextBridge 暴露方法

## 安全规则

- 不要在 Renderer 中直接使用 Node.js API，必须通过 Preload 暴露
- 不要绕过 contextBridge，保持 contextIsolation: true
- 不要启用 nodeIntegration

## 开发要点

- 路径别名：Renderer 内 `@/` 指向 `src/renderer/`
- 状态管理：Jotai 原子化状态
- Dev 模式：Renderer 加载 Vite dev server (localhost:5173)
- Main/Preload 构建为 CJS (.cjs)，import 语法会被转换
- 窗口配置：1200x800, hiddenInset titleBar

## 关键文件

- `src/main/main.ts` - 窗口创建与应用生命周期
- `src/main/ipc.ts` - IPC handler 注册
- `src/preload/preload.ts` - contextBridge API 暴露
- `src/renderer/main.tsx` - React 入口
- `src/renderer/App.tsx` - 根组件
- `forge.config.ts` - Electron Forge 打包配置
- `vite.main.config.ts` / `vite.preload.config.ts` / `vite.renderer.config.ts` - 各进程 Vite 配置
