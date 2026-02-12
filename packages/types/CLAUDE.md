# @xiaoa/types - 共享类型定义

Electron 三进程间共享的类型定义，核心是类型安全的 IPC 通信。

## 文件结构

- `src/ipc.ts` - IPC 通道常量 (IPC_CHANNELS)
- `src/electron.ts` - ElectronAPI 接口（匹配 preload 暴露的 API）
- `src/index.ts` - 统一导出

## IPC 通道模式

```typescript
// ipc.ts - 始终使用 as const 保证类型安全
export const IPC_CHANNELS = {
  PING: "ping",
  // 新通道加在这里
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
```

## ElectronAPI 接口

```typescript
// electron.ts - 必须与 preload 暴露的方法一一对应
export interface ElectronAPI {
  ping: () => Promise<string>
}
```

## 新增 IPC 通道步骤

1. `src/ipc.ts` → 添加通道常量到 IPC_CHANNELS
2. `src/electron.ts` → 添加方法到 ElectronAPI 接口
3. `apps/electron/src/main/ipc.ts` → 注册 ipcMain.handle 处理函数
4. `apps/electron/src/preload/preload.ts` → 通过 contextBridge 暴露方法

## 规范

- 所有 IPC 通道必须定义在 IPC_CHANNELS 中，禁止使用字符串字面量
- ElectronAPI 接口必须与 preload 暴露的方法精确匹配
- 只放跨进程共享的类型，Renderer 专属类型放在 Renderer 本地
- 保持平台无关，不依赖 Electron 或 Node.js 类型
