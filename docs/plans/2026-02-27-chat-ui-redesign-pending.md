# Chat UI Turn-Based 重构计划

> **目标：** 引入 Turn-Based 消息分组架构，将用户消息 + 助手响应 + 工具调用组合为 Turn 单元，提升对话可读性

**技术栈：** React 19 + Tailwind CSS 4 + 现有 ai-elements 组件

---

## 设计目标

| 目标 | 说明 |
|------|------|
| Turn 分组 | 将用户消息 + 助手响应 + 工具调用组合为一个 Turn Card |
| Phase 状态 | 为每个 Turn 提供状态指示（pending → tool_active → streaming → complete） |
| 展开持久化 | Turn 展开状态持久化到 localStorage |

---

## 已有功能（无需实现）

以下功能已在 ai-elements 中实现，无需重复开发：

| 功能 | 组件 | 说明 |
|------|------|------|
| 工具状态展示 | `Tool.tsx` | 状态图标、标签、折叠、输入输出 |
| 思考状态 | `Reasoning.tsx` | 流式思考、自动开关、持续时间 |
| 对话滚动 | `Conversation.tsx` | 自动滚动、滚动按钮 |
| 输入动画 | `PromptInput.tsx` | 自适应高度、动画 |
| Markdown 渲染 | `assistant-message.tsx` | 已使用 react-markdown |

---

## 任务计划

### 任务 1: 定义 Turn 数据模型

**状态**：todo

**文件：**

- 创建: `src/components/chat/types/turn.ts`

**步骤 1: 编写 Turn 类型定义**

```typescript
// src/components/chat/types/turn.ts
import type { AgentMessage } from "@mariozechner/pi-agent-core";

/** Turn 阶段状态 */
export type TurnPhase =
  | 'pending'      // Turn 创建，等待第一个活动
  | 'tool_active'  // 至少一个工具正在运行
  | 'streaming'    // 最终响应文本正在流式输出
  | 'complete';    // Turn 完成

/** Turn 数据结构 */
export interface Turn {
  id: string;
  userMessage: AgentMessage;
  assistantMessage?: AgentMessage;
  toolCalls: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    result?: AgentMessage;
  }>;
  phase: TurnPhase;
  startTime: number;
  endTime?: number;
}
```

**步骤 2: 运行类型检查**

运行: `bun run check-types`

**步骤 3: 提交**

```bash
git add src/components/chat/types/turn.ts
git commit -m "feat(chat): add Turn data model types"
```

---

### 任务 2: 实现消息分组工具函数

**状态**：todo

**依赖**：任务 1

**文件：**

- 创建: `src/components/chat/utils/turn-utils.ts`

**步骤 1: 编写消息分组函数**

```typescript
// src/components/chat/utils/turn-utils.ts
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { Turn, TurnPhase } from "../types/turn";

/** 将扁平消息列表分组为 Turn 数组 */
export function groupMessagesByTurn(messages: AgentMessage[]): Turn[] {
  const turns: Turn[] = [];
  let currentTurn: Turn | null = null;

  for (const message of messages) {
    // 用户消息：flush 当前 turn，开始新 turn
    if (message.role === 'user') {
      if (currentTurn) {
        currentTurn.phase = deriveTurnPhase(currentTurn);
        turns.push(currentTurn);
      }
      currentTurn = {
        id: `turn-${message.timestamp}`,
        userMessage: message,
        toolCalls: [],
        phase: 'pending',
        startTime: message.timestamp,
      };
      continue;
    }

    if (!currentTurn) continue;

    // Assistant 消息
    if (message.role === 'assistant') {
      currentTurn.assistantMessage = message;

      // 提取工具调用
      const content = message.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block?.type === 'toolCall') {
            currentTurn.toolCalls.push({
              id: block.id,
              name: block.name,
              arguments: block.arguments,
            });
          }
        }
      }

      // 检查是否完成
      const isComplete = !('isComplete' in message) || !(message as any).isComplete;
      if (!isComplete) {
        currentTurn.phase = 'complete';
        currentTurn.endTime = message.timestamp;
        turns.push(currentTurn);
        currentTurn = null;
      }
    }

    // Tool Result
    if (message.role === 'toolResult') {
      const tr = message as any;
      const toolCall = currentTurn.toolCalls.find(tc => tc.id === tr.toolCallId);
      if (toolCall) {
        toolCall.result = message;
      }
    }
  }

  // 添加未完成的 turn
  if (currentTurn) {
    currentTurn.phase = deriveTurnPhase(currentTurn);
    turns.push(currentTurn);
  }

  return turns;
}

/** 推导 Turn 阶段 */
export function deriveTurnPhase(turn: Turn): TurnPhase {
  if (turn.assistantMessage) {
    const isComplete = !('isComplete' in turn.assistantMessage) ||
      !(turn.assistantMessage as any).isComplete;
    if (!isComplete) return 'complete';
    return 'streaming';
  }
  if (turn.toolCalls.some(tc => tc.result === undefined)) {
    return 'tool_active';
  }
  return 'pending';
}
```

**步骤 2: 运行类型检查**

**步骤 3: 提交**

```bash
git add src/components/chat/utils/turn-utils.ts
git commit -m "feat(chat): add message grouping utilities for Turn"
```

---

### 任务 3: 实现 TurnCard 组件

**状态**：todo

**依赖**：任务 1, 2

**文件：**

- 创建: `src/components/chat/components/turn-card.tsx`

**说明：** 复用现有的 ai-elements 组件（Tool、Reasoning），仅添加 Turn 包装层

**步骤 1: 编写 TurnCard 组件**

```typescript
// src/components/chat/components/turn-card.tsx
import { Bot, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/tailwind";
import type { Turn } from "../types/turn";
import { deriveTurnPhase } from "../utils/turn-utils";
import { ToolMessage } from "../message-renderers/tool-message";
import { AssistantMessage } from "../message-renderers/assistant-message";
import { UserMessage } from "../message-renderers/user-message";

interface TurnCardProps {
  turn: Turn;
  agentAvatar?: string;
  agentName?: string;
  defaultExpanded?: boolean;
}

export function TurnCard({
  turn,
  agentAvatar,
  agentName = "小A",
  defaultExpanded = true,
}: TurnCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const phase = deriveTurnPhase(turn);
  const isStreaming = phase === 'streaming';
  const hasToolCalls = turn.toolCalls.length > 0;

  return (
    <div className="group flex flex-col gap-3" data-slot="turn-card">
      {/* 用户消息 */}
      <UserMessage
        content={extractUserText(turn.userMessage)}
        timestamp={turn.startTime}
      />

      {/* AI 响应区域 */}
      {hasToolCalls && (
        <div className="flex gap-3">
          <Avatar size="sm">
            <AvatarFallback>
              <Bot className="size-3" />
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* 工具调用折叠控制 */}
            <div className="flex items-center gap-2">
              <Button
                className="h-6 px-2"
                onClick={() => setIsExpanded(!isExpanded)}
                size="sm"
                variant="ghost"
              >
                {isExpanded ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
                <span className="ml-1 text-xs">
                  {turn.toolCalls.length} 个操作
                </span>
              </Button>
            </div>

            {/* 工具调用列表（可折叠） */}
            {isExpanded && (
              <div className="mt-2 space-y-2">
                {turn.toolCalls.map((tc) => (
                  <ToolMessage
                    key={tc.id}
                    result={tc.result as any}
                    toolCall={tc}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 助手消息 */}
      {turn.assistantMessage && (
        <AssistantMessage
          avatar={agentAvatar}
          content={(turn.assistantMessage as any).content}
          isStreaming={isStreaming}
          name={agentName}
          timestamp={turn.assistantMessage.timestamp}
        />
      )}

      {/* 思考指示器 */}
      {phase === 'pending' && !turn.assistantMessage && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Sparkles className="size-3 animate-pulse" />
          <span>思考中...</span>
        </div>
      )}
    </div>
  );
}

function extractUserText(message: any): string {
  const content = message.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((c: any) => c?.type === 'text')
      .map((c: any) => c.text)
      .join('\n');
  }
  return '';
}
```

**步骤 2: 运行类型检查**

**步骤 3: 提交**

```bash
git add src/components/chat/components/turn-card.tsx
git commit -m "feat(chat): add TurnCard component using existing ai-elements"
```

---

### 任务 4: 实现 TurnList 容器组件

**状态**：todo

**依赖**：任务 1, 2, 3

**文件：**

- 创建: `src/components/chat/components/turn-list.tsx`

**步骤 1: 编写 TurnList 组件**

```typescript
// src/components/chat/components/turn-list.tsx
import { Bot } from "lucide-react";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { cn } from "@/utils/tailwind";
import type { Turn } from "../types/turn";
import { groupMessagesByTurn } from "../utils/turn-utils";
import { TurnCard } from "./turn-card";

interface TurnListProps {
  messages: AgentMessage[];
  streamingMessage?: AgentMessage | null;
  isStreaming?: boolean;
  agentAvatar?: string;
  agentName?: string;
  className?: string;
}

export function TurnList({
  messages,
  streamingMessage,
  agentAvatar,
  agentName,
  className,
}: TurnListProps) {
  // 合并流式消息
  const allMessages = streamingMessage
    ? [...messages, streamingMessage]
    : messages;

  // 分组为 Turn
  const turns = groupMessagesByTurn(allMessages);

  return (
    <Conversation
      aria-label="对话列表"
      className={cn("min-h-0 flex-1", className)}
      data-slot="turn-list"
      role="log"
    >
      <ConversationContent>
        {turns.length === 0 && (
          <ConversationEmptyState
            description="输入消息开始与助手交流"
            icon={<Bot className="size-12 opacity-50" />}
            title="开始对话"
          />
        )}

        {turns.map((turn, index) => (
          <TurnCard
            agentAvatar={agentAvatar}
            agentName={agentName}
            defaultExpanded={index === turns.length - 1}
            key={turn.id}
            turn={turn}
          />
        ))}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
```

**步骤 2: 运行类型检查**

**步骤 3: 提交**

```bash
git add src/components/chat/components/turn-list.tsx
git commit -m "feat(chat): add TurnList container using Conversation"
```

---

### 任务 5: 实现展开状态持久化

**状态**：todo

**依赖**：任务 3

**文件：**

- 创建: `src/components/chat/hooks/use-turn-expansion.ts`

**步骤 1: 编写 useTurnExpansion Hook**

```typescript
// src/components/chat/hooks/use-turn-expansion.ts
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "xiaoa_turn_expansion";
const MAX_SESSIONS = 100;

interface ExpansionMap {
  [sessionId: string]: {
    turns: string[];
    lastAccessed: number;
  };
}

function readMap(): ExpansionMap {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function writeMap(map: ExpansionMap): void {
  try {
    const entries = Object.entries(map);
    if (entries.length > MAX_SESSIONS) {
      const sorted = entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
      const toRemove = sorted.slice(0, entries.length - MAX_SESSIONS);
      for (const [key] of toRemove) {
        delete map[key];
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // 忽略存储错误
  }
}

export function useTurnExpansion(sessionId?: string) {
  const [expandedTurns, setExpandedTurns] = useState<Set<string>>(() => {
    if (!sessionId) return new Set();
    const map = readMap();
    const entry = map[sessionId];
    return entry ? new Set(entry.turns) : new Set();
  });

  // 持久化
  useEffect(() => {
    if (!sessionId) return;
    const map = readMap();
    map[sessionId] = {
      turns: [...expandedTurns],
      lastAccessed: Date.now(),
    };
    writeMap(map);
  }, [sessionId, expandedTurns]);

  const toggleTurn = useCallback((turnId: string) => {
    setExpandedTurns(prev => {
      const next = new Set(prev);
      if (next.has(turnId)) next.delete(turnId);
      else next.add(turnId);
      return next;
    });
  }, []);

  const isTurnExpanded = useCallback((turnId: string) => {
    return expandedTurns.has(turnId);
  }, [expandedTurns]);

  return {
    isTurnExpanded,
    toggleTurn,
  };
}
```

**步骤 2: 运行类型检查**

**步骤 3: 提交**

```bash
git add src/components/chat/hooks/use-turn-expansion.ts
git commit -m "feat(chat): add useTurnExpansion hook with LRU persistence"
```

---

### 任务 6: 重构 ChatView 使用 TurnList（可选）

**状态**：todo

**依赖**：任务 1-5

**说明：** 这是一个可选任务，用于将现有的 `AgentMessageList` 替换为 `TurnList`。由于现有实现已经工作良好，此任务可以根据需要决定是否执行。

**文件：**

- 修改: `src/components/chat/chat-view.tsx`

**步骤 1: 更新 ChatView（可选）**

```typescript
// chat-view.tsx 关键修改
import { TurnList } from "./components/turn-list";

// 替换 AgentMessageList（可选）
<TurnList
  agentAvatar={agentAvatar}
  agentName={agentName}
  className="flex-1"
  isStreaming={isGenerating}
  messages={messages}
  streamingMessage={streamingMessage}
/>
```

**步骤 2: 手动测试**

运行: `bun run start`

**步骤 3: 提交**

```bash
git add src/components/chat/chat-view.tsx
git commit -m "refactor(chat): optionally integrate TurnList into ChatView"
```

---

### 任务 7: 添加单元测试

**状态**：todo

**依赖**：任务 1, 2

**文件：**

- 创建: `src/tests/unit/turn-utils.test.ts`

**步骤 1: 编写测试**

```typescript
// src/tests/unit/turn-utils.test.ts
import { describe, it, expect } from "vitest";
import { groupMessagesByTurn, deriveTurnPhase } from "@/components/chat/utils/turn-utils";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { Turn } from "@/components/chat/types/turn";

describe("groupMessagesByTurn", () => {
  it("should group user message with assistant response", () => {
    const messages: AgentMessage[] = [
      { role: "user", content: "Hello", timestamp: 1000 } as any,
      { role: "assistant", content: [{ type: "text", text: "Hi!" }], timestamp: 2000, isComplete: true } as any,
    ];

    const turns = groupMessagesByTurn(messages);

    expect(turns).toHaveLength(1);
    expect(turns[0].userMessage).toEqual(messages[0]);
    expect(turns[0].phase).toBe("complete");
  });

  it("should extract tool calls from assistant message", () => {
    const messages: AgentMessage[] = [
      { role: "user", content: "Read file", timestamp: 1000 } as any,
      {
        role: "assistant",
        content: [
          { type: "toolCall", id: "tc-1", name: "read_file", arguments: { path: "/test" } },
          { type: "text", text: "Done" },
        ],
        timestamp: 2000,
        isComplete: true,
      } as any,
    ];

    const turns = groupMessagesByTurn(messages);

    expect(turns[0].toolCalls).toHaveLength(1);
    expect(turns[0].toolCalls[0].name).toBe("read_file");
  });
});

describe("deriveTurnPhase", () => {
  it("should return pending for empty turn", () => {
    const turn: Turn = {
      id: "test",
      userMessage: {} as any,
      toolCalls: [],
      phase: "pending",
      startTime: 1000,
    };

    expect(deriveTurnPhase(turn)).toBe("pending");
  });
});
```

**步骤 2: 运行测试**

运行: `bun run test src/tests/unit/turn-utils.test.ts`

**步骤 3: 提交**

```bash
git add src/tests/unit/turn-utils.test.ts
git commit -m "test(chat): add unit tests for turn-utils"
```

---

## 任务依赖关系

```
任务 1 (Turn 类型) ──> 任务 2 (工具函数) ──┬──> 任务 3 (TurnCard)
                                          │
                                          └──> 任务 4 (TurnList) ──> 任务 6 (ChatView 集成)
                                                                       │
任务 5 (展开持久化) ───────────────────────────────────────────────────┘
任务 7 (测试) ──────────────────────────────────────────────────────────
```

**建议执行顺序**: 1 → 2 → 3 → 4 → 5 → 7（任务 6 为可选）

---

## 总结

本计划相比原始版本已大幅简化：

| 原始任务 | 处理方式 |
|---------|---------|
| 任务 1: Turn 数据模型 | ✅ 保留 |
| 任务 2: Phase Hook | ❌ 删除（Reasoning.tsx 已有） |
| 任务 3: Activity Tree | ❌ 删除（Tool.tsx 已有） |
| 任务 4: TurnCard | ✅ 保留（简化，复用现有组件） |
| 任务 5: TurnList | ✅ 保留（简化） |
| 任务 6: 展开持久化 | ✅ 保留 |
| 任务 7: FadeScrollArea | ❌ 删除（Conversation.tsx 已有） |
| 任务 8: InputContainer | ❌ 删除（PromptInput.tsx 已有） |
| 任务 9: ChatView 集成 | ✅ 保留（标记为可选） |
| 任务 10: 组件导出 | ❌ 删除（按需导出即可） |
| 任务 11: 单元测试 | ✅ 保留 |
| 任务 12: 文档更新 | ❌ 删除（非必要） |

**从 12 个任务简化为 7 个任务**，核心价值是 Turn 分组逻辑和展开状态持久化。
