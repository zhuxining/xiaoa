# 会话与对话 UI 重构计划

## Context

当前会话系统存在三个核心问题：
1. **新建会话发消息后显示"no messages"** — 消息查询因 staleTime 和 JSONL 文件写入延迟无法可靠返回消息
2. **发送消息后列表出现重复会话** — `getSessionFilePath` 的 fallback 路径不符合 pi 命名规范，导致 `SessionManager.open()` 创建新文件
3. **会话内容不能在对话窗口显示** — 消息查询找不到正确的 JSONL 文件

此外，`index.tsx`（430 行）和 `$projectId.tsx`（770 行）中有大量重复的会话/对话状态管理代码。

## 重构步骤

### Step 1: 修复 `getSessionFilePath` fallback（解决重复会话）

**文件**: `src/agent/paths.ts`

当前 fallback 返回 `{sessionId}.jsonl`（无时间戳前缀），但 `SessionManager.create()` 使用 `{timestamp}_{sessionId}.jsonl` 格式。`SessionManager.open()` 打开不存在的 `{sessionId}.jsonl` 时会创建新会话，导致重复。

**修改**:
- fallback 改为 `${Date.now()}_${sessionId}.jsonl`
- 同时匹配 `${sessionId}.jsonl`（兼容已有文件）

```typescript
// 查找时同时匹配两种格式
const matchedFile = files.find(
  (f) => f.endsWith(`_${sessionId}.jsonl`) || f === `${sessionId}.jsonl`
);
// fallback 使用 pi 格式
return path.join(sessionsDir, `${Date.now()}_${sessionId}.jsonl`);
```

### Step 2: 提取 `useChatSession` Hook（消除代码重复 + 修复消息显示）

**新建文件**: `src/hooks/use-chat-session.ts`

将两个路由文件中重复的 ~200 行状态逻辑提取为一个 hook：

```typescript
interface UseChatSessionOptions {
  scope: ChatScope;
  workspaceId: string | null;
  projectPath?: string;
  cwd?: string;
  workspaceRootPath?: string;
  initialSessionId?: string;
}

interface UseChatSessionReturn {
  // 会话列表
  sessions: ChatSession[];
  currentSessionId: string | undefined;
  selectSession: (id: string) => void;
  createSession: () => Promise<SessionMeta>;
  deleteSession: (id: string) => void;
  // 消息
  messages: AgentMessage[];
  streamingMessage: AgentMessage | null;
  // 对话运行
  isGenerating: boolean;
  sendMessage: (content: string) => void;
  abort: () => void;
  // 权限
  permissionRequest: PermissionRequest | null;
  allowPermission: (request: PermissionRequest) => void;
  denyPermission: (request: PermissionRequest) => void;
}
```

**核心修复点**：
1. 会话列表和消息查询设置 `staleTime: 0`，确保 invalidation 后立即 refetch
2. 移除 `sendChatMutation.onSuccess` 中过早的消息 invalidation（此时 agent 还没开始执行）
3. run 结束后使用 `setTimeout(refetch, 300)` 等待 JSONL 刷盘
4. `eventCursor` 使用 `useRef` 而非 `useState`，避免 queryKey 不必要变化
5. 统一事件处理函数，替代 `applyHomeChatEvent` / `applyProjectChatEvent`
6. **自动创建会话**: `sendMessage` 在无 session 时先创建再发送

### Step 3: 迁移 HomePage 使用 Hook

**文件**: `src/routes/index.tsx`

从 ~430 行简化为 ~80 行，仅保留：
- 模型配置逻辑
- `useChatSession({ scope: "global", workspaceId: null })`
- `<ChatView>` 渲染

删除所有 `useState`（isGenerating/streamingContent/activeRunId/eventCursor/permissionRequest）、事件轮询 query、事件处理 effect、`applyHomeChatEvent` 函数。

### Step 4: 迁移 ProjectPage 使用 Hook

**文件**: `src/routes/workspace/$workspaceId/project/$projectId.tsx`

从 ~770 行简化为 ~250 行，仅保留：
- 项目/工作区特有逻辑（文件树、文件预览、技能、权限模式）
- `useChatSession({ scope: "workspace", workspaceId, projectPath: projectId, cwd: project?.path, ... })`
- URL 搜索参数同步（hook 不感知路由，路由层负责 navigate）

## 关键文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/agent/paths.ts` | 修改 | 修复 fallback 路径命名 |
| `src/hooks/use-chat-session.ts` | 新建 | 统一的会话/对话状态 hook |
| `src/routes/index.tsx` | 重构 | 430→~80 行 |
| `src/routes/workspace/$workspaceId/project/$projectId.tsx` | 重构 | 770→~250 行 |

## 复用的现有函数

- `src/actions/session.ts`: `listSessions`, `createSession`, `deleteSession`, `getSessionMessages`
- `src/actions/chat.ts`: `sendChat`, `abortChat`, `getChatEvents`, `respondChatPermission`
- `src/components/chat/chat-view.tsx`: `ChatView` 组件保持不变
- `src/components/chat/session-list.tsx`: `SessionList` 组件保持不变

## 验证方式

1. 创建新会话 → 发送消息 → 消息应在对话窗口中流式显示
2. 发送消息后 → 会话列表不应出现重复会话
3. 切换已有会话 → 历史消息应正确显示
4. 删除会话 → 自动切换到下一个会话
5. 无会话时直接发消息 → 应自动创建会话并发送
6. `bun run check-types` 通过
7. `bun run check` 通过
