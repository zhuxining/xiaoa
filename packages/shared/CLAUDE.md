# @xiaoa/shared - 共享工具库

非 UI 的共享工具函数和业务逻辑，供 Main 和 Renderer 进程复用。

## 职责边界

**适合放在这里的：**

- 纯函数工具（数据处理、格式化、验证）
- 共享常量和配置
- 平台无关的业务逻辑

**不应放在这里的：**

- UI 组件 → `@xiaoa/ui`
- IPC/Electron 类型 → `@xiaoa/types`
- Electron API 调用 → `apps/electron/src/main/`
- React 相关代码 → `apps/electron/src/renderer/`

## 规范

- 通过 src/index.ts 统一导出
- 使用 named exports
- 不要依赖 Electron、React 或任何 UI 框架
- 导入方式：`import { xxx } from "@xiaoa/shared"`
