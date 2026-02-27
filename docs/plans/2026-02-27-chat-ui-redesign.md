# Chat UI 仿制 Craft Agents 计划

> **执行提示：** 使用 execute-plan 技能来逐任务实现此计划。

**目标：** 参考 craft-agents-oss 的 chat 模块设计，重构小 A 的 Chat UI，实现 Turn Card 模式、Activity Tree、Phase 状态机、动画效果等核心特性。

**架构：** 采用 Turn-Based 消息分组架构，将用户消息 + 助手响应 + 工具调用组合为 Turn 单元。引入 Phase 状态机驱动 UI 显示，使用 Framer Motion 实现流畅动画，保持与现有 pi-coding-agent 数据模型的兼容性。

**技术栈：** React 19 + Framer Motion + Tailwind CSS 4 + 现有 shadcn/ui 组件

---

## 核心设计差异分析

| 特性 | Craft Agents | 小 A 当前 | 仿制优先级 |
|------|-------------|----------|-----------|
| 消息分组 | Turn Card（用户+助手+工具为一组） | 扁平消息列表 | P0 |
| 工具调用展示 | Activity Tree（深度嵌套） | 扁平 ToolMessage | P0 |
| 状态机 | 5 阶段 Phase | isStreaming boolean | P0 |
| 输入动画 | Framer Motion 高度动画 | 静态输入框 | P1 |
| 深度思考模式 | Ultrathink + WebGL 光效 | 无 | P2 |
| 展开状态持久化 | LRU localStorage | 无 | P1 |
| 滚动边界 | Gradient Fade | 无 | P1 |

---

## 任务 1: 定义 Turn 数据模型与工具函数

**状态**：todo

**文件：**
- 创建: `src/components/chat/types/turn.ts`
- 创建: `src/components/chat/utils/turn-utils.ts`

**步骤 1: 编写 Turn 类型定义**

```typescript
// src/components/chat/types/turn.ts
import type { AgentMessage } from "@mariozechner/pi-agent-core";

/** Turn 阶段状态 */
export type TurnPhase =
  | 'pending'      // Turn 创建，等待第一个活动
  | 'tool_active'  // 至少一个工具正在运行
  | 'awaiting'     // 所有工具完成，等待下一个动作（间隙期）
  | 'streaming'    // 最终响应文本正在流式输出
  | 'complete';    // Turn 完成

/** Activity 类型 */
export type ActivityType = 'tool' | 'intermediate' | 'plan' | 'status';

/** Activity 状态 */
export type ActivityStatus = 'pending' | 'running' | 'completed' | 'error' | 'interrupted';

/** Activity 项 */
export interface ActivityItem {
  id: string;
  type: ActivityType;
  status: ActivityStatus;
  name: string;
  arguments?: Record<string, unknown>;
  result?: string;
  error?: string;
  parentId?: string;
  depth: number;
  timestamp: number;
}

/** Turn 数据结构 */
export interface Turn {
  id: string;
  userMessage: AgentMessage;
  activities: ActivityItem[];
  response?: {
    content: string;
    isStreaming: boolean;
  };
  phase: TurnPhase;
  startTime: number;
  endTime?: number;
}
```

**步骤 2: 编写消息分组工具函数**

```typescript
// src/components/chat/utils/turn-utils.ts
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { ActivityItem, ActivityStatus, Turn, TurnPhase } from "../types/turn";

/** 将扁平消息列表分组为 Turn 数组 */
export function groupMessagesByTurn(messages: AgentMessage[]): Turn[] {
  const turns: Turn[] = [];
  let currentTurn: Turn | null = null;

  for (const message of messages) {
    // 用户消息：flush 当前 turn，开始新 turn
    if (message.role === 'user') {
      if (currentTurn) {
        turns.push(currentTurn);
      }
      currentTurn = {
        id: `turn-${message.timestamp}`,
        userMessage: message,
        activities: [],
        phase: 'pending',
        startTime: message.timestamp,
      };
      continue;
    }

    // 如果没有当前 turn，跳过
    if (!currentTurn) continue;

    // Assistant 消息
    if (message.role === 'assistant') {
      const content = message.content;
      const isStreaming = !('isComplete' in message) || !(message as any).isComplete;

      // 提取工具调用
      const toolCalls = extractToolCalls(content);

      for (const tc of toolCalls) {
        currentTurn.activities.push({
          id: tc.id,
          type: 'tool',
          status: 'completed',
          name: tc.name,
          arguments: tc.arguments,
          timestamp: message.timestamp,
          depth: 0,
        });
      }

      // 设置响应内容
      const textContent = extractTextContent(content);
      if (textContent) {
        currentTurn.response = {
          content: textContent,
          isStreaming,
        };
      }

      // 如果完成，flush turn
      if (!isStreaming) {
        currentTurn.phase = 'complete';
        currentTurn.endTime = message.timestamp;
        turns.push(currentTurn);
        currentTurn = null;
      }
    }

    // Tool Result
    if (message.role === 'toolResult') {
      const tr = message as any;
      if (currentTurn) {
        const activity = currentTurn.activities.find(a => a.id === tr.toolCallId);
        if (activity) {
          activity.result = extractTextFromToolResult(tr);
          activity.status = tr.isError ? 'error' : 'completed';
        }
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
  if (turn.response && !turn.response.isStreaming) {
    return 'complete';
  }
  if (turn.response?.isStreaming) {
    return 'streaming';
  }
  const hasRunningTool = turn.activities.some(a => a.status === 'running');
  if (hasRunningTool) {
    return 'tool_active';
  }
  if (turn.activities.length > 0) {
    return 'awaiting';
  }
  return 'pending';
}

// ... 辅助函数实现
```

**步骤 3: 运行类型检查**

运行: `bun run check-types`
预期: 无类型错误

**步骤 4: 提交**

```bash
git add src/components/chat/types/turn.ts src/components/chat/utils/turn-utils.ts
git commit -m "feat(chat): add Turn data model and grouping utilities"
```

---

## 任务 2: 实现 Turn Phase 状态机 Hook

**状态**：todo

**文件：**
- 创建: `src/components/chat/hooks/use-turn-phase.ts`

**步骤 1: 编写 useTurnPhase Hook**

```typescript
// src/components/chat/hooks/use-turn-phase.ts
import { useMemo } from 'react';
import type { Turn, TurnPhase } from '../types/turn';
import { deriveTurnPhase } from '../utils/turn-utils';

export interface UseTurnPhaseResult {
  phase: TurnPhase;
  isComplete: boolean;
  isStreaming: boolean;
  hasRunningTools: boolean;
  activitySummary: string;
}

export function useTurnPhase(turn: Turn): UseTurnPhaseResult {
  return useMemo(() => {
    const phase = deriveTurnPhase(turn);
    const isComplete = phase === 'complete';
    const isStreaming = phase === 'streaming';
    const hasRunningTools = phase === 'tool_active';

    // 生成活动摘要
    const runningCount = turn.activities.filter(a => a.status === 'running').length;
    const completedCount = turn.activities.filter(a => a.status === 'completed').length;
    const totalCount = turn.activities.length;

    let activitySummary = '';
    if (hasRunningTools) {
      activitySummary = `${runningCount} 个工具运行中`;
    } else if (totalCount > 0) {
      activitySummary = `${completedCount}/${totalCount} 完成`;
    }

    return {
      phase,
      isComplete,
      isStreaming,
      hasRunningTools,
      activitySummary,
    };
  }, [turn]);
}
```

**步骤 2: 运行类型检查**

运行: `bun run check-types`
预期: 无类型错误

**步骤 3: 提交**

```bash
git add src/components/chat/hooks/use-turn-phase.ts
git commit -m "feat(chat): add useTurnPhase hook for phase state machine"
```

---

## 任务 3: 实现 Activity Tree 组件

**状态**：todo

**文件：**
- 创建: `src/components/chat/components/activity-item.tsx`
- 创建: `src/components/chat/components/activity-tree.tsx`

**步骤 1: 编写 ActivityItem 组件**

```typescript
// src/components/chat/components/activity-item.tsx
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  Loader2,
  Terminal,
  FileText,
  Wrench,
} from "lucide-react";
import { cn } from "@/utils/tailwind";
import type { ActivityItem as ActivityItemType, ActivityStatus } from "../types/turn";

const SIZE_CONFIG = {
  fontSize: 'text-[13px]',
  iconSize: 'h-3.5 w-3.5',
  padding: 'py-0.5',
  gap: 'gap-1',
};

function getStatusIcon(status: ActivityStatus) {
  switch (status) {
    case 'pending':
      return <Circle className={cn(SIZE_CONFIG.iconSize, "text-muted-foreground")} />;
    case 'running':
      return <Loader2 className={cn(SIZE_CONFIG.iconSize, "animate-spin text-primary")} />;
    case 'completed':
      return <CheckCircle2 className={cn(SIZE_CONFIG.iconSize, "text-green-500")} />;
    case 'error':
      return <CircleAlert className={cn(SIZE_CONFIG.iconSize, "text-destructive")} />;
    case 'interrupted':
      return <CircleAlert className={cn(SIZE_CONFIG.iconSize, "text-amber-500")} />;
    default:
      return null;
  }
}

function getToolIcon(name: string) {
  if (name.includes('bash') || name.includes('shell')) return Terminal;
  if (name.includes('file') || name.includes('read') || name.includes('write')) return FileText;
  return Wrench;
}

interface ActivityItemProps {
  activity: ActivityItemType;
  isExpanded: boolean;
  onToggle: () => void;
}

export function ActivityItemView({ activity, isExpanded, onToggle }: ActivityItemProps) {
  const ToolIcon = getToolIcon(activity.name);
  const hasDetails = activity.result || activity.error;

  return (
    <div
      className={cn(
        "relative flex items-center gap-2 rounded-md px-2 cursor-pointer",
        SIZE_CONFIG.padding,
        "hover:bg-foreground/5"
      )}
      style={{ paddingLeft: `${activity.depth * 16 + 8}px` }}
      onClick={onToggle}
    >
      {/* 树形连接线 */}
      {activity.depth > 0 && (
        <div className="absolute left-[-4px] top-2 bottom-2 w-px bg-border/30" />
      )}

      {/* 状态图标 */}
      {getStatusIcon(activity.status)}

      {/* 工具图标 */}
      <ToolIcon className={cn(SIZE_CONFIG.iconSize, "text-muted-foreground")} />

      {/* 工具名称 */}
      <span className={cn(SIZE_CONFIG.fontSize, "flex-1 truncate")}>
        {activity.name}
      </span>

      {/* 展开/收起指示器 */}
      {hasDetails && (
        <span className="text-muted-foreground text-xs">
          {isExpanded ? '收起' : '详情'}
        </span>
      )}
    </div>
  );
}
```

**步骤 2: 编写 ActivityTree 组件**

```typescript
// src/components/chat/components/activity-tree.tsx
import { useState } from "react";
import { cn } from "@/utils/tailwind";
import type { ActivityItem } from "../types/turn";
import { ActivityItemView } from "./activity-item";

interface ActivityTreeProps {
  activities: ActivityItem[];
  className?: string;
}

export function ActivityTree({ activities, className }: ActivityTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (activities.length === 0) return null;

  return (
    <div className={cn("space-y-0.5", className)}>
      {activities.map(activity => (
        <ActivityItemView
          activity={activity}
          isExpanded={expandedIds.has(activity.id)}
          key={activity.id}
          onToggle={() => toggleExpand(activity.id)}
        />
      ))}
    </div>
  );
}
```

**步骤 3: 运行类型检查**

运行: `bun run check-types`
预期: 无类型错误

**步骤 4: 提交**

```bash
git add src/components/chat/components/activity-item.tsx src/components/chat/components/activity-tree.tsx
git commit -m "feat(chat): add ActivityTree component with depth indentation"
```

---

## 任务 4: 实现 TurnCard 核心组件

**状态**：todo

**文件：**
- 创建: `src/components/chat/components/turn-card.tsx`
- 创建: `src/components/chat/components/response-card.tsx`

**步骤 1: 编写 ResponseCard 组件**

```typescript
// src/components/chat/components/response-card.tsx
import { memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/utils/tailwind";

interface ResponseCardProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

/** 流式 Markdown 渲染（带 memo 优化） */
const MemoizedMarkdown = memo(
  Markdown,
  (prev, next) => prev.children === next.children
);

export function ResponseCard({ content, isStreaming, className }: ResponseCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg bg-muted/50 px-4 py-3",
        isStreaming && "animate-pulse-subtle",
        className
      )}
    >
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <MemoizedMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </MemoizedMarkdown>
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-foreground/50 animate-blink ml-0.5" />
        )}
      </div>
    </div>
  );
}
```

**步骤 2: 编写 TurnCard 组件**

```typescript
// src/components/chat/components/turn-card.tsx
import { Bot, ChevronDown, ChevronRight, MoreHorizontal, Sparkles } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/tailwind";
import type { Turn } from "../types/turn";
import { useTurnPhase } from "../hooks/use-turn-phase";
import { ActivityTree } from "./activity-tree";
import { ResponseCard } from "./response-card";
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
  const { phase, isStreaming, hasRunningTools, activitySummary } = useTurnPhase(turn);

  const showActivities = turn.activities.length > 0;
  const showResponse = turn.response && turn.response.content;

  return (
    <div className="group flex flex-col gap-3" data-slot="turn-card">
      {/* 用户消息 */}
      <UserMessage
        content={extractUserText(turn.userMessage)}
        timestamp={turn.startTime}
      />

      {/* AI 响应区域 */}
      <div className="flex gap-3">
        <Avatar size="sm">
          <AvatarImage src={agentAvatar} />
          <AvatarFallback>
            {isStreaming ? (
              <Sparkles className="size-3 animate-pulse" />
            ) : (
              <Bot className="size-3" />
            )}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Turn Header */}
          <div className="flex items-center justify-between gap-2 sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{agentName}</span>
              {activitySummary && (
                <span className="text-muted-foreground text-xs">
                  {activitySummary}
                </span>
              )}
            </div>

            {/* 展开控制 */}
            {showActivities && (
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
                  {turn.activities.length} 个操作
                </span>
              </Button>
            )}

            {/* 更多操作菜单（hover 显示） */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon-sm" variant="ghost">
                <MoreHorizontal className="size-3" />
              </Button>
            </div>
          </div>

          {/* Activities（可折叠） */}
          {showActivities && (
            <motion.div
              animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
              initial={false}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <ActivityTree
                activities={turn.activities}
                className="mt-2"
              />
            </motion.div>
          )}

          {/* 响应内容 */}
          {showResponse && (
            <ResponseCard
              className="mt-2"
              content={turn.response.content}
              isStreaming={isStreaming}
            />
          )}

          {/* 思考指示器 */}
          {phase === 'awaiting' && !showResponse && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm mt-2">
              <Sparkles className="size-3 animate-pulse" />
              <span>思考中...</span>
            </div>
          )}
        </div>
      </div>
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

**步骤 3: 添加 framer-motion 依赖（如未安装）**

运行: `bun add framer-motion`
预期: 安装成功

**步骤 4: 运行类型检查**

运行: `bun run check-types`
预期: 无类型错误

**步骤 5: 提交**

```bash
git add src/components/chat/components/turn-card.tsx src/components/chat/components/response-card.tsx
git commit -m "feat(chat): add TurnCard component with phase-based rendering"
```

---

## 任务 5: 实现 TurnList 容器组件

**状态**：todo

**文件：**
- 创建: `src/components/chat/components/turn-list.tsx`

**步骤 1: 编写 TurnList 组件**

```typescript
// src/components/chat/components/turn-list.tsx
import { Bot } from "lucide-react";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  isStreaming,
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
    <ScrollArea className={cn("flex-1", className)} data-slot="turn-list">
      <div className="flex flex-col gap-6 p-4">
        {turns.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <Bot className="mx-auto mb-4 size-12 opacity-50" />
            <p className="font-medium">开始对话</p>
            <p className="mt-1 text-sm">输入消息开始与助手交流</p>
          </div>
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
      </div>
    </ScrollArea>
  );
}
```

**步骤 2: 运行类型检查**

运行: `bun run check-types`
预期: 无类型错误

**步骤 3: 提交**

```bash
git add src/components/chat/components/turn-list.tsx
git commit -m "feat(chat): add TurnList container component"
```

---

## 任务 6: 实现展开状态持久化

**状态**：todo

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
    groups: string[];
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
    // LRU 淘汰
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

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    if (!sessionId) return new Set();
    const map = readMap();
    const entry = map[sessionId];
    return entry ? new Set(entry.groups) : new Set();
  });

  // 持久化
  useEffect(() => {
    if (!sessionId) return;
    const map = readMap();
    map[sessionId] = {
      turns: [...expandedTurns],
      groups: [...expandedGroups],
      lastAccessed: Date.now(),
    };
    writeMap(map);
  }, [sessionId, expandedTurns, expandedGroups]);

  const toggleTurn = useCallback((turnId: string, expanded: boolean) => {
    setExpandedTurns(prev => {
      const next = new Set(prev);
      if (expanded) next.add(turnId);
      else next.delete(turnId);
      return next;
    });
  }, []);

  const toggleGroup = useCallback((groupId: string, expanded: boolean) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (expanded) next.add(groupId);
      else next.delete(groupId);
      return next;
    });
  }, []);

  const isTurnExpanded = useCallback((turnId: string) => {
    return expandedTurns.has(turnId);
  }, [expandedTurns]);

  const isGroupExpanded = useCallback((groupId: string) => {
    return expandedGroups.has(groupId);
  }, [expandedGroups]);

  return {
    isTurnExpanded,
    isGroupExpanded,
    toggleTurn,
    toggleGroup,
  };
}
```

**步骤 2: 运行类型检查**

运行: `bun run check-types`
预期: 无类型错误

**步骤 3: 提交**

```bash
git add src/components/chat/hooks/use-turn-expansion.ts
git commit -m "feat(chat): add useTurnExpansion hook with LRU persistence"
```

---

## 任务 7: 实现滚动边界渐变效果

**状态**：todo

**文件：**
- 创建: `src/components/chat/components/fade-scroll-area.tsx`

**步骤 1: 编写 FadeScrollArea 组件**

```typescript
// src/components/chat/components/fade-scroll-area.tsx
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/tailwind";

interface FadeScrollAreaProps {
  children: React.ReactNode;
  className?: string;
  fadeSize?: number;
}

export function FadeScrollArea({
  children,
  className,
  fadeSize = 32,
}: FadeScrollAreaProps) {
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      setShowTopFade(scrollTop > fadeSize);
      setShowBottomFade(scrollTop + clientHeight < scrollHeight - fadeSize);
    };

    el.addEventListener("scroll", checkScroll);
    checkScroll();
    return () => el.removeEventListener("scroll", checkScroll);
  }, [fadeSize]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* 顶部渐变 */}
      {showTopFade && (
        <div
          className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
          style={{
            height: fadeSize,
            background: "linear-gradient(to bottom, var(--background), transparent)",
          }}
        />
      )}

      {/* 滚动内容 */}
      <div
        className="overflow-auto h-full"
        ref={scrollRef}
        style={{
          maskImage: `linear-gradient(to bottom, transparent 0%, black ${fadeSize}px, black calc(100% - ${fadeSize}px), transparent 100%)`,
          WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, black ${fadeSize}px, black calc(100% - ${fadeSize}px), transparent 100%)`,
        }}
      >
        {children}
      </div>

      {/* 底部渐变 */}
      {showBottomFade && (
        <div
          className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
          style={{
            height: fadeSize,
            background: "linear-gradient(to top, var(--background), transparent)",
          }}
        />
      )}
    </div>
  );
}
```

**步骤 2: 运行类型检查**

运行: `bun run check-types`
预期: 无类型错误

**步骤 3: 提交**

```bash
git add src/components/chat/components/fade-scroll-area.tsx
git commit -m "feat(chat): add FadeScrollArea with gradient fade boundaries"
```

---

## 任务 8: 实现 InputContainer 动画组件

**状态**：todo

**文件：**
- 创建: `src/components/chat/components/input-container.tsx`

**步骤 1: 编写 InputContainer 组件**

```typescript
// src/components/chat/components/input-container.tsx
import type React from "react";
import { useRef, useState } from "react";
import { motion, useMotionValue, useMotionValueEvent } from "framer-motion";
import { cn } from "@/utils/tailwind";

const TRANSITION_DURATION = 0.25;
const TRANSITION_EASE = [0.4, 0, 0.2, 1] as const;

interface InputContainerProps {
  children: React.ReactNode;
  structuredInput?: React.ReactNode;
  isStructuredMode?: boolean;
  onAnimatedHeightChange?: (delta: number) => void;
  className?: string;
}

export function InputContainer({
  children,
  structuredInput,
  isStructuredMode = false,
  onAnimatedHeightChange,
  className,
}: InputContainerProps) {
  const [contentKey, setContentKey] = useState(0);
  const measureRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const heightMotionValue = useMotionValue(0);

  // 监听高度变化，通知父组件进行滚动同步
  useMotionValueEvent(heightMotionValue, "change", (latest) => {
    const prev = measureRef.current?.offsetHeight || 0;
    const delta = latest - prev;
    onAnimatedHeightChange?.(delta);
  });

  const renderContent = (isMeasuring: boolean) => {
    if (isStructuredMode && structuredInput) {
      return structuredInput;
    }
    return children;
  };

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {/* 隐藏的测量层 */}
      <div
        className="absolute invisible pointer-events-none"
        ref={measureRef}
      >
        {renderContent(true)}
      </div>

      {/* 动画容器 */}
      <motion.div
        animate={{ height: "auto" }}
        className="rounded-xl shadow-middle overflow-hidden bg-background border"
        style={{ height: heightMotionValue }}
        transition={{ duration: TRANSITION_DURATION, ease: TRANSITION_EASE }}
      >
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key={isStructuredMode ? "structured" : "freeform"}
            transition={{ duration: TRANSITION_DURATION, ease: TRANSITION_EASE }}
          >
            {renderContent(false)}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
```

**步骤 2: 运行类型检查**

运行: `bun run check-types`
预期: 无类型错误

**步骤 3: 提交**

```bash
git add src/components/chat/components/input-container.tsx
git commit -m "feat(chat): add InputContainer with Framer Motion animation"
```

---

## 任务 9: 重构 ChatView 使用新组件

**状态**：todo

**文件：**
- 修改: `src/components/chat/chat-view.tsx`
- 修改: `src/components/chat/index.ts`（添加导出）

**步骤 1: 更新 ChatView 使用 TurnList**

在 `chat-view.tsx` 中：
1. 导入 `TurnList` 替换 `AgentMessageList`
2. 传递新的 props 结构
3. 保持向后兼容的 API

```typescript
// chat-view.tsx 关键修改
import { TurnList } from "./components/turn-list";

// 替换 AgentMessageList
<TurnList
  agentAvatar={agentAvatar}
  agentName={agentName}
  className="flex-1"
  isStreaming={isGenerating}
  messages={messages}
  streamingMessage={streamingMessage}
/>
```

**步骤 2: 运行类型检查**

运行: `bun run check-types`
预期: 无类型错误

**步骤 3: 手动测试**

运行: `bun run start`
预期: 应用启动，chat 界面正常显示

**步骤 4: 提交**

```bash
git add src/components/chat/chat-view.tsx src/components/chat/index.ts
git commit -m "refactor(chat): integrate TurnList into ChatView"
```

---

## 任务 10: 添加组件索引和类型导出

**状态**：todo

**文件：**
- 创建: `src/components/chat/index.ts`
- 创建: `src/components/chat/types/index.ts`

**步骤 1: 创建类型索引**

```typescript
// src/components/chat/types/index.ts
export * from "./turn";
```

**步骤 2: 创建组件索引**

```typescript
// src/components/chat/index.ts
// 组件
export * from "./components/activity-item";
export * from "./components/activity-tree";
export * from "./components/fade-scroll-area";
export * from "./components/input-container";
export * from "./components/response-card";
export * from "./components/turn-card";
export * from "./components/turn-list";

// Hooks
export * from "./hooks/use-turn-expansion";
export * from "./hooks/use-turn-phase";

// Types
export * from "./types/turn";

// Utils
export * from "./utils/turn-utils";

// 保留现有导出
export * from "./chat-view";
export * from "./message-input";
```

**步骤 3: 运行类型检查**

运行: `bun run check-types`
预期: 无类型错误

**步骤 4: 提交**

```bash
git add src/components/chat/index.ts src/components/chat/types/index.ts
git commit -m "feat(chat): add component and type exports"
```

---

## 任务 11: 添加单元测试

**状态**：todo

**文件：**
- 创建: `src/tests/unit/turn-utils.test.ts`
- 创建: `src/tests/unit/use-turn-phase.test.ts`

**步骤 1: 编写 turn-utils 测试**

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
      { role: "assistant", content: [{ type: "text", text: "Hi!" }], timestamp: 2000 } as any,
    ];

    const turns = groupMessagesByTurn(messages);

    expect(turns).toHaveLength(1);
    expect(turns[0].userMessage).toEqual(messages[0]);
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
      } as any,
    ];

    const turns = groupMessagesByTurn(messages);

    expect(turns[0].activities).toHaveLength(1);
    expect(turns[0].activities[0].name).toBe("read_file");
  });
});

describe("deriveTurnPhase", () => {
  it("should return pending for empty turn", () => {
    const turn: Turn = {
      id: "test",
      userMessage: {} as any,
      activities: [],
      phase: "pending",
      startTime: 1000,
    };

    expect(deriveTurnPhase(turn)).toBe("pending");
  });

  it("should return complete when response is done", () => {
    const turn: Turn = {
      id: "test",
      userMessage: {} as any,
      activities: [],
      response: { content: "Done", isStreaming: false },
      phase: "streaming",
      startTime: 1000,
    };

    expect(deriveTurnPhase(turn)).toBe("complete");
  });
});
```

**步骤 2: 运行测试**

运行: `bun run test src/tests/unit/turn-utils.test.ts`
预期: 测试通过

**步骤 3: 提交**

```bash
git add src/tests/unit/turn-utils.test.ts
git commit -m "test(chat): add unit tests for turn-utils"
```

---

## 任务 12: 集成测试与文档更新

**状态**：todo

**文件：**
- 修改: `docs/design/architecture.md`（更新 Chat 模块架构说明）

**步骤 1: 更新架构文档**

在 `docs/design/architecture.md` 中添加 Turn-Based Chat UI 章节，说明：
1. Turn 数据模型
2. Phase 状态机
3. 组件层级结构

**步骤 2: 运行完整测试**

运行: `bun run test:all`
预期: 所有测试通过

**步骤 3: 最终提交**

```bash
git add docs/design/architecture.md
git commit -m "docs: update architecture with Turn-Based Chat UI design"
```

---

## 执行顺序与依赖关系

```
任务 1 (Turn 类型) ──┬──> 任务 2 (Phase Hook) ──┐
                     │                          │
                     └──> 任务 3 (Activity) ────┼──> 任务 4 (TurnCard) ──> 任务 5 (TurnList)
                                                │
任务 6 (Expansion) ─────────────────────────────┘
任务 7 (Fade Scroll) ───────────────────────────┐
任务 8 (Input Animation) ───────────────────────┤
                                                └──> 任务 9 (ChatView 集成) ──> 任务 10 (导出) ──> 任务 11 (测试) ──> 任务 12 (文档)
```

**关键路径**: 1 → 2 → 4 → 5 → 9 → 11
**可并行**: 3, 6, 7, 8 可与 2 并行开发

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| pi-agent-core 消息格式变化 | 高 | 在 turn-utils 中添加类型守卫和 fallback |
| Framer Motion 包体积 | 中 | 使用 tree-shaking，仅导入 motion 组件 |
| 流式消息重复显示 | 高 | 使用 isStreamingMessageRedundant 检查 |
| 展开状态丢失 | 低 | LRU 淘汰机制 + localStorage fallback |
