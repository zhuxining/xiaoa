# UI 组件与页面设计重构计划

> **执行提示：** 使用 execute-plan 技能来逐任务实现此计划。

**目标：** 审查并修复当前 UI 中不可用的功能，重构基础组件体系使其健壮可用

**架构：** 保持现有 TanStack Router + Query + oRPC 架构不变，聚焦于修复功能性问题、消除硬编码、增强组件复用性

**技术栈：** React 19 + TailwindCSS 4 + shadcn/ui + TanStack Router/Query

---

## 问题诊断总结

经全面审查，识别出以下 **功能性问题**：

### P0 - 功能不可用
1. **首页会话缺少删除功能** — `index.tsx` 的 SessionList 没有传入 `onSessionDelete`，会话只能创建不能删除
2. **首页 Skill 选择无实际效果** — `handleSkillSelect` 只有 `console.log`，选中技能后不会修改发送内容
3. **首页 Skills 列表硬编码** — 使用静态 `SKILLS` 数组，未从工作区配置加载
4. **模型列表硬编码且不一致** — `chat-view.tsx` 硬编码 4 个模型，`agent.tsx` 硬编码另外 4 个，`llm-config-form.tsx` 又一套

### P1 - 功能缺陷
5. **消息渲染不支持 Markdown** — `assistant-message.tsx` 仅用 `whitespace-pre-wrap` 做纯文本渲染，不支持 Markdown
6. **Textarea 高度不自适应** — `message-input.tsx` 的 autoHeight 只在挂载时执行一次，输入多行文本不会自动增长
7. **首页缺少会话重命名** — SessionList 组件不支持重命名
8. **ProjectView 中 streamingMessage 重复拼接** — `$projectId.tsx` 中既在 `displayMessages` 合并了 streaming，又传给 ChatView（ChatView 内部的 AgentMessageList 也会合并）

### P2 - 设计问题
9. **模型配置分散** — 3 个地方各自定义模型列表，无统一数据源
10. **Session 类型重复定义** — `chat-view.tsx` 和 `session-list.tsx` 各自定义 `Session` interface
11. **测试文件类型错误过多** — 31 个类型错误全在测试文件中

---

## 任务计划

### 任务 1: 统一模型配置数据源

**状态**：todo

**文件：**
- 创建: `src/constants/models.ts`
- 修改: `src/components/chat/chat-view.tsx:33-38`
- 修改: `src/routes/workspace/$workspaceId/agent.tsx:25-30`
- 修改: `src/components/settings/llm-config-form.tsx:31-44`

**步骤 1: 创建统一的模型配置常量**

```typescript
// src/constants/models.ts
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

export const MODELS: ModelInfo[] = [
  { id: "claude-sonnet-4-5-20250514", name: "Claude Sonnet 4.5", provider: "anthropic" },
  { id: "claude-opus-4-5-20250514", name: "Claude Opus 4.5", provider: "anthropic" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "anthropic" },
  { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai" },
  { id: "deepseek-chat", name: "DeepSeek Chat", provider: "deepseek" },
  { id: "deepseek-reasoner", name: "DeepSeek Reasoner", provider: "deepseek" },
];

export function getModelsByProvider(provider: string): ModelInfo[] {
  return MODELS.filter((m) => m.provider === provider);
}

export function getModelName(id: string): string {
  return MODELS.find((m) => m.id === id)?.name ?? id;
}
```

**步骤 2: 更新 chat-view.tsx 引用统一数据源**

删除 `AVAILABLE_MODELS` 常量，从 `@/constants/models` 导入 `MODELS` 和 `ModelInfo`。

**步骤 3: 更新 agent.tsx 引用统一数据源**

删除 `MODELS` 常量，从 `@/constants/models` 导入。

**步骤 4: 更新 llm-config-form.tsx 引用统一数据源**

删除 `MODELS_BY_PROVIDER`，改用 `getModelsByProvider()`。

**步骤 5: 提交**

```bash
git add src/constants/models.ts src/components/chat/chat-view.tsx src/routes/workspace/\$workspaceId/agent.tsx src/components/settings/llm-config-form.tsx
git commit -m "refactor: unify model configuration into single source"
```

---

### 任务 2: 统一 Session 类型定义

**状态**：todo

**文件：**
- 创建: `src/types/session.ts`
- 修改: `src/components/chat/chat-view.tsx:20-25`
- 修改: `src/components/chat/session-list.tsx:6-11`
- 修改: `src/components/project/project-view.tsx` (import)

**步骤 1: 创建统一 Session 类型**

```typescript
// src/types/session.ts
export interface ChatSession {
  id: string;
  title: string;
  updatedAt: Date;
  messageCount: number;
}
```

**步骤 2: 更新 chat-view.tsx 使用统一类型**

删除 `Session` interface，从 `@/types/session` 导入 `ChatSession`，更新 props 类型。

**步骤 3: 更新 session-list.tsx 使用统一类型**

删除 `Session` interface，从 `@/types/session` 导入 `ChatSession`。

**步骤 4: 更新 project-view.tsx 的导入**

改为从 `@/types/session` 导入。

**步骤 5: 提交**

```bash
git add src/types/session.ts src/components/chat/chat-view.tsx src/components/chat/session-list.tsx src/components/project/project-view.tsx
git commit -m "refactor: unify Session type definition"
```

---

### 任务 3: 修复首页会话管理（删除功能 + 数据流修复）

**状态**：todo

**文件：**
- 修改: `src/routes/index.tsx`
- 修改: `src/components/chat/chat-view.tsx`
- 修改: `src/components/chat/session-list.tsx`

**步骤 1: 给 SessionList 添加删除按钮**

在 `session-list.tsx` 每个会话项添加 hover 显示的删除按钮（参照 project-view.tsx 中的实现）。添加 `onSessionDelete` prop。

```tsx
// session-list.tsx props 新增
interface SessionListProps {
  // ... existing
  onSessionDelete?: (id: string) => void;
}
```

每个 session 项使用 group 容器 + hover 显示删除按钮。

**步骤 2: ChatView 透传 onSessionDelete prop**

在 ChatViewProps 中添加 `onSessionDelete`，传给 SessionList。

**步骤 3: 在 index.tsx 添加删除 mutation**

```typescript
const deleteSessionMutation = useMutation({
  mutationFn: (sessionId: string) =>
    deleteSession({ workspaceId: null, id: sessionId }),
  onSuccess: (_, sessionId) => {
    queryClient.invalidateQueries({ queryKey: ["session", "global", "list"] });
    if (currentSessionId === sessionId) {
      const next = sessions.find((s) => s.id !== sessionId);
      setCurrentSessionId(next?.id);
    }
  },
});
```

**步骤 4: 提交**

```bash
git add src/routes/index.tsx src/components/chat/chat-view.tsx src/components/chat/session-list.tsx
git commit -m "feat: add session delete to home page chat"
```

---

### 任务 4: 修复 MessageInput Textarea 自动高度

**状态**：todo

**文件：**
- 修改: `src/components/chat/message-input.tsx:103-108`

**步骤 1: 修复 autoHeight 逻辑**

当前 `useEffect` 只在挂载时执行，需要在 `value` 变化时也执行：

```typescript
useEffect(() => {
  if (textareaRef.current) {
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }
}, [value]); // 添加 value 依赖
```

**步骤 2: 提交**

```bash
git add src/components/chat/message-input.tsx
git commit -m "fix: textarea auto-height on content change"
```

---

### 任务 5: 添加 Markdown 渲染支持

**状态**：todo

**文件：**
- 修改: `src/components/chat/message-renderers/assistant-message.tsx`

**步骤 1: 安装 react-markdown 和 remark-gfm**

```bash
bun add react-markdown remark-gfm
```

**步骤 2: 替换纯文本渲染为 Markdown 渲染**

将 `parseContent` 和手动代码块提取逻辑替换为 react-markdown + CodeBlock 的组合：

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 在 renderContentBlock 的 "text" case 中：
case "text":
  return (
    <ReactMarkdown
      key={`text-${index}`}
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const isInline = !match;
          if (isInline) {
            return <code className="rounded bg-muted px-1 py-0.5 text-sm" {...props}>{children}</code>;
          }
          return <CodeBlock code={String(children).replace(/\n$/, "")} language={match[1]} />;
        },
      }}
    >
      {block.text}
    </ReactMarkdown>
  );
```

**步骤 3: 删除不再需要的 parseContent 函数**

**步骤 4: 提交**

```bash
git add src/components/chat/message-renderers/assistant-message.tsx package.json bun.lockb
git commit -m "feat: add Markdown rendering for assistant messages"
```

---

### 任务 6: 修复 ProjectPage streaming 消息重复拼接

**状态**：todo

**文件：**
- 修改: `src/routes/workspace/$workspaceId/project/$projectId.tsx:352-354`
- 修改: `src/components/project/project-view.tsx`

**步骤 1: 移除 displayMessages 合并**

当前 `$projectId.tsx` 既创建了 `displayMessages`（合并 streaming），又将合并后的结果传给 ChatView 内部的 AgentMessageList（也会合并 streamingMessage）。修复方式：直接传 `messages` 和 `streamingMessage`，让 ChatView 内部统一处理。

删除 `displayMessages` 变量，将 ProjectView 的 messages prop 改为传 messages。

**步骤 2: 更新 ProjectView 接受并透传 streamingMessage**

```typescript
interface ProjectViewProps {
  // ... existing
  streamingMessage?: AgentMessage | null;
}
```

将 `streamingMessage` 透传给 ChatView。

**步骤 3: 提交**

```bash
git add src/routes/workspace/\$workspaceId/project/\$projectId.tsx src/components/project/project-view.tsx
git commit -m "fix: remove duplicate streaming message concatenation"
```

---

### 任务 7: 首页 Skill 功能修复

**状态**：todo

**文件：**
- 修改: `src/routes/index.tsx:23-42,364-366`

**步骤 1: 移除硬编码 SKILLS，使用空数组**

首页（全局会话）暂时不需要技能系统（技能绑定在工作区上），移除硬编码的 SKILLS 常量和无用 import。当无活跃工作区时传空数组。

```typescript
// 删除 SKILLS 常量和 FileText, Globe, Wrench import
// ChatView 的 skills prop 传空数组
<ChatView
  skills={[]}
  // ...
/>
```

**步骤 2: 删除无用的 handleSkillSelect console.log**

**步骤 3: 提交**

```bash
git add src/routes/index.tsx
git commit -m "fix: remove hardcoded skills from home page"
```

---

### 任务 8: 修复测试文件类型错误

**状态**：todo

**文件：**
- 修改: `src/tests/unit/agent/extension-factory.test.ts`
- 修改: `src/tests/unit/agent/run-executor.test.ts`
- 修改: `src/tests/unit/agent/run-store.test.ts`
- 修改: `src/tests/unit/ipc/workspace-store.test.ts`

**步骤 1: 修复 extension-factory.test.ts 的 ExtensionAPI mock**

使用 `as unknown as ExtensionAPI` 类型断言。

**步骤 2: 修复 run-executor.test.ts 的事件类型**

补充 `contentIndex`、`partial`、`args`、`result`、`isError` 等必需字段。

**步骤 3: 修复 run-store.test.ts 的 workspaceId 缺失**

在所有 event 对象中添加 `workspaceId: null`。

**步骤 4: 修复 workspace-store.test.ts 的 undefined 检查**

添加可选链或非空断言。

**步骤 5: 运行类型检查确认通过**

```bash
bun run check-types
```

**步骤 6: 提交**

```bash
git add src/tests/
git commit -m "fix: resolve type errors in test files"
```

---

## 任务依赖关系

```
任务 1 (模型统一) ── 无依赖
任务 2 (Session 类型) ── 无依赖
任务 3 (会话删除) ── 依赖任务 2
任务 4 (Textarea 高度) ── 无依赖
任务 5 (Markdown 渲染) ── 无依赖
任务 6 (streaming 修复) ── 无依赖
任务 7 (Skill 修复) ── 无依赖
任务 8 (测试修复) ── 无依赖
```

任务 1、2、4、5、6、7、8 可并行执行，任务 3 需在任务 2 完成后进行。

---

## 执行顺序建议

1. 任务 1 → 任务 2 → 任务 3（有依赖链）
2. 任务 4、5、6、7 可与上述并行
3. 任务 8 最后执行（不影响功能）
