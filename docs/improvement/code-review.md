# Code Review - 小A 项目改进建议

> 审查时间：2026-02-13 | 分支：dev | 项目阶段：早期开发
>
> 整体评价：架构设计优秀，三进程分离清晰，workspace 包划分合理。以下为具体改进项。

## 1. @xiaoa/shared 与 @xiaoa/ui 最佳实践问题

### P0 - 主题类型与 UI tokens 不一致

**文件**: `packages/shared/src/theme/types.ts` vs `packages/ui/src/styles/tokens.css`

`ThemeColors` 定义了 7 个字段（background, foreground, primary, secondary, accent, muted, border），而 `tokens.css` 实际定义了 `destructive`、`success`、`warning`、`highlight`、`disabled` 等 token，没有 `accent`。

`generateCssVariables()` (`shared/src/theme/utils.ts:67`) 生成 `--xiaoa-*` 前缀变量，与 UI 包使用的 `--color-*` 前缀不一致。

**修复**: 移除 `shared/src/theme/` 模块。UI 包已通过 CSS 变量完整处理主题，shared 中的 theme 模块是冗余的且与实际不同步。

### P0 - shared 包职责边界违反

**文件**: `packages/shared/src/theme/utils.ts:19`

`getEffectiveTheme()` 使用 `window.matchMedia`（浏览器 API），违反 shared 包 CLAUDE.md 明确规定的"不要依赖 React 或任何 UI 框架"。

**文件**: `packages/shared/src/utils/files.ts`

使用 Node.js `fs` API（`readFileSync`, `writeFileSync`, `renameSync`），不能在 Renderer 进程中使用。功能本身正确，但需明确标注仅限 Main 进程。

**修复**:

- theme 模块移至 `@xiaoa/ui` 或直接删除（CSS 变量已覆盖需求）
- `files.ts` 在 `shared/CLAUDE.md` 中标注为 Main-only 工具，或移至 `apps/electron/src/main/`

### P1 - UI 组件目录为空

**文件**: `packages/ui/CLAUDE.md` 声明了 `src/components/chat/`、`src/components/input/`、`src/components/message/`

这些目录实际不存在。`index.ts` 注释 "Styled components will be exported here" 但无实际组件导出。

**修复**: 更新 CLAUDE.md 移除未实现的目录声明，待实际开发时再添加。

### P1 - createVariants 是空壳函数

**文件**: `packages/ui/src/lib/styles.ts:104-108`

```typescript
export function createVariants<T extends string>(
  variants: Record<T, string>,
): Record<T, string> {
  return variants; // identity 函数，无实际逻辑
}
```

**修复**: 实现类似 cva 的变体组合逻辑（base + variants + compoundVariants），或直接移除导出，避免给使用者错误预期。

### P2 - mergeProps style 合并顺序反直觉

**文件**: `packages/ui/src/lib/styles.ts:142`

```typescript
result.style = Object.assign({}, ...styleParts.reverse());
```

`.reverse()` 导致先传入的 style 优先级更高，与 className 的后者覆盖行为不一致。

**修复**: 移除 `.reverse()`，使 style 和 className 合并行为一致（后者优先）。

## 2. Electron IPC 层问题

### P0 - ipc.ts:33 类型引用错误

**文件**: `apps/electron/src/main/ipc.ts:33`

```typescript
async (_event, provider: typeof config.provider) => {
```

`config` 是上方 `LLM_TEST` handler 内的局部变量，此处引用的是一个不存在的作用域变量。应为 `LLMConfig["provider"]`。

**修复**:

```typescript
async (_event, provider: LLMConfig["provider"]) => {
```

### P1 - IPC handler 大量重复模式

**文件**: `apps/electron/src/main/ipc.ts`（402 行）

90% 的代码是相同的 CRUD 模式：接收参数 -> 生成 ID -> 调用 storage -> 无返回值。Workspace、Session、Message、Skill、Memory、Knowledge、Project 共 7 个实体，每个实体 3-5 个 handler。

**修复**: 抽取工厂函数，将重复减少到声明式配置：

```typescript
function createCrudHandlers<T extends { id: string }>(
  entity: string,
  channels: { getAll: string; create: string; ... },
  storage: { getAll: () => T[]; create: (item: T) => void; ... },
) { ... }
```

### P1 - IPC handler 缺少错误处理

**文件**: `apps/electron/src/main/ipc.ts` 全部 handler

所有 `ipcMain.handle` 回调都没有 try-catch。storage 操作（文件 I/O）失败会导致 unhandled rejection，Renderer 只收到一个不可读的错误。

**修复**: 添加统一包装函数：

```typescript
function safeHandler<T>(fn: (...args: any[]) => Promise<T>) {
  return async (...args: any[]) => {
    try { return await fn(...args); }
    catch (e) { throw new Error(`IPC Error: ${e.message}`); }
  };
}
```

### P2 - create handler 不返回创建的对象

**文件**: `apps/electron/src/main/ipc.ts:104`（及所有 create handler）

```typescript
storage.createWorkspace(newWorkspace);
// 无 return，Renderer 无法获取服务端生成的 id
```

**修复**: 所有 create handler 返回完整对象 `return newWorkspace;`

## 3. Storage 服务问题

### P1 - 未使用 shared 包的原子写入工具

**文件**: `apps/electron/src/main/services/storage.ts`

全局使用 `writeFileSync()` 直接写入，而 `@xiaoa/shared/utils/files.ts` 提供了 `writeJsonFile()`（write-to-temp-then-rename 原子写入模式）。

当前方式在崩溃时可能导致 JSON 文件写入一半而损坏。

**修复**: 将 `writeFileSync(file, JSON.stringify(data, null, 2))` 替换为 `writeJsonFile(file, data)`。

### P1 - updateConfig 浅合并问题

**文件**: `apps/electron/src/main/services/storage.ts:53`

```typescript
this.globalConfigCache = { ...this.globalConfigCache, ...updates };
```

展开运算符只做浅合并。调用 `updateConfig({ llm: { apiKey: "xxx" } })` 会丢失 `llm` 中的其他字段（provider、model 等）。

`ipc.ts:23` 中已有手动展开 workaround：

```typescript
storage.updateConfig({ llm: { ...storage.getConfig().llm, apiKey } });
```

**修复**: 使用 `@xiaoa/shared` 的 `deepMerge()`：

```typescript
this.globalConfigCache = deepMerge(this.globalConfigCache, updates);
```

### P2 - 同步 I/O 阻塞主进程

**文件**: `apps/electron/src/main/services/storage.ts` 全部方法

所有文件操作使用同步 API。`getSessions()` (行 146-155) 和 `getMessages()` (行 203-219) 会在目录中逐个同步读取 JSON 文件，workspace 和 session 数量增长后会明显阻塞主进程事件循环。

**修复**: 迁移到 `fs/promises` 异步 API，优先处理批量读取方法。

## 4. LLM 服务问题

### P1 - 硬编码窗口获取

**文件**: `apps/electron/src/main/services/llm.ts:111`

```typescript
const win = BrowserWindow.getAllWindows()[0];
```

多窗口场景下会把 stream event 发送到错误的窗口。

**修复**: 通过 `event.sender` 或将 `BrowserWindow` 引用作为参数传入 `streamChat()`。

### P1 - Agent 实例内存泄漏

**文件**: `apps/electron/src/main/services/llm.ts:33`

```typescript
const agentInstances = new Map<string, Agent>();
```

只在 `streamChat()` 中添加（行 98），从不删除。关闭 session 后 Agent 实例（含完整消息历史）永远驻留内存。

**修复**: 在 session 删除的 IPC handler 中清理对应 agent：

```typescript
agentInstances.delete(sessionId);
abortControllers.delete(sessionId);
```

### P2 - API Key 未传递给 model

**文件**: `apps/electron/src/main/services/llm.ts:87`

```typescript
const model = getModel(llmConfig.provider, llmConfig.model);
```

`getModel()` 没有接收 `apiKey` 参数，依赖 pi-ai 内部从环境变量读取。用户在 UI 中配置的 key 实际不会生效。

**修复**: 确认 `pi-ai` 的 `getModel()` 是否支持 apiKey 参数，如支持则传入 `llmConfig.apiKey`。

## 5. Renderer 层问题

### P0 - App.tsx 未集成 MainLayout

**文件**: `apps/electron/src/renderer/App.tsx`

```typescript
function App() {
  return (
    <div className="flex h-screen items-center justify-center">
      <h1 className="text-2xl font-bold">小 A</h1>
    </div>
  );
}
```

根组件是占位符。`MainLayout`、`Sidebar`、`ChatView` 等已实现的组件均未被渲染。

**修复**: 将 App.tsx 改为渲染 `<MainLayout />`。

### P1 - Settings 未持久化

**文件**: `apps/electron/src/renderer/components/Settings/SettingsPage.tsx`

主题切换（行 72-79）只修改 Jotai atom 的内存状态，不调用 `window.electronAPI` 同步到 storage。重启应用后设置丢失。

LLM 配置（provider、apiKey、model）的 `<select>` 和 `<input>` 元素没有绑定 `value` 和 `onChange`，完全不可交互。

**修复**:

- 添加 save handler 调用 IPC 持久化配置
- 绑定表单控件的 value/onChange 到 atom 状态

### P1 - streamingStatusAtom 内存泄漏

**文件**: `apps/electron/src/renderer/atoms/chat.ts:11`

```typescript
export const streamingStatusAtom = atom<Record<string, StreamingStatus>>({});
```

`done` 和 `error` 事件（行 49-52）将 `isStreaming` 设为 false 但不清除 session entry。虽然存在 `clearStreamingStatusAtom`（行 78-84），但没有被自动调用。

**修复**: 在 `done`/`error` 分支中延迟调用 clear，或在 `updateStreamingStatusAtom` 中自动清理已完成 session。

## 6. Types 包问题

### P2 - ElectronAPI 使用 inline import

**文件**: `packages/types/src/electron.ts`

全部使用 `import("./models").Workspace` 风格（共约 30 处），降低可读性。

**修复**: 使用顶层 `import type` 语句：

```typescript
import type { Workspace, Session, Message, ... } from "./models";
```

## 7. 代码组织优化

### P2 - Renderer 缺少 Error Boundary

任何 React 组件崩溃会导致整个 Renderer 白屏，用户无法恢复。

**修复**: 在 `App.tsx` 外层添加 React Error Boundary，提供友好的错误提示和重试按钮。

### P2 - sessions.ts 与 storage.ts 职责重叠

**文件**: `apps/electron/src/main/services/sessions.ts` vs `storage.ts`

`SessionService` 包装了 storage 的 session/message CRUD，额外生成 message ID（行 41）。但 `ipc.ts` 中 session CRUD handler（行 127-184）直接调用 storage 而非 sessionService，仅 `CHAT_SEND` 使用 sessionService。

同时 sessionService 用 `msg_${Date.now()}_random` 生成 ID，而 ipc.ts 用 `generateId("message")`，两套 ID 格式不统一。

**修复**: 统一调用路径 — chat 相关操作走 sessionService，session CRUD 也走 sessionService；ID 生成统一使用 `generateId()`。
