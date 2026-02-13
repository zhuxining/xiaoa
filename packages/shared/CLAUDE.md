# @xiaoa/shared - 共享工具库

非 UI 的共享工具函数和业务逻辑，供 Main 和 Renderer 进程复用。

## 模块结构

- `config/` — 常量、默认值、配置校验
- `format/` — 文本和时间格式化（date-fns）
- `mcp/` — MCP 服务器类型和验证（zod）
- `utils/` — ID 生成（nanoid）、数据处理（defu）、日志
- `validation/` — 统一 zod schema（ID 格式、URL、配置）

## 核心依赖

- `nanoid` — ID 生成（替代手写 timestamp+random）
- `zod` — Schema 验证（统一所有校验逻辑）
- `defu` — 深度合并（替代手写 deepMerge）
- `date-fns` — 时间格式化（支持 i18n）

## 职责边界

**适合放在这里的：**

- 纯函数工具（数据处理、格式化、验证）
- 共享常量和配置
- 平台无关的业务逻辑

**不应放在这里的：**

- UI 组件 → `@xiaoa/ui`
- IPC/Electron 类型 → `@xiaoa/types`
- Electron API / Node.js fs/path → `apps/electron/src/main/`
- React 相关代码 → `apps/electron/src/renderer/`

## 规范

- 通过 src/index.ts 统一导出
- 使用 named exports
- 不要依赖 Electron、React 或任何 UI 框架
- 不要使用 Node.js 专属 API（fs、path、os 等）
- 导入方式：`import { xxx } from "@xiaoa/shared"`

## 未来规划（Phase 2+）

- `parsers/` — 文件解析工具（Markdown、JSON Schema 等）
- `scoring/` — 评分和排序算法
