/**
 * pi-message-list.tsx - pi-web-ui <message-list> React 19 wrapper
 *
 * React 19 支持 Web Components，但 object/function props 需要 ref 命令式赋值。
 * 该组件封装 pi-web-ui 的 MessageList LitElement，提供类型安全的 React API。
 */

import type { AgentMessage, AgentTool } from "@mariozechner/pi-agent-core";
import React, { useLayoutEffect, useRef } from "react";

/**
 * message-list Web Component 的属性接口
 */
interface MessageListElement extends HTMLElement {
  isStreaming: boolean;
  messages: AgentMessage[];
  onCostClick?: () => void;
  pendingToolCalls?: Set<string>;
  tools: AgentTool[];
}

export interface PiMessageListProps {
  /** 自定义类名 */
  className?: string;
  /** 是否正在流式输出 */
  isStreaming?: boolean;
  /** 消息列表 */
  messages: AgentMessage[];
  /** 点击成本时回调 */
  onCostClick?: () => void;
  /** 待处理的工具调用 ID */
  pendingToolCalls?: Set<string>;
  /** 流式消息（追加到 messages 末尾） */
  streamingMessage?: AgentMessage | null;
  /** 可用工具列表 */
  tools?: AgentTool[];
}

/**
 * PiMessageList - pi-web-ui MessageList 的 React 封装
 *
 * 使用 useLayoutEffect 命令式赋值 object/function props，
 * 确保每次渲染后 Web Component 属性同步更新。
 *
 * @example
 * ```tsx
 * <PiMessageList
 *   messages={messages}
 *   streamingMessage={streamingMessage}
 *   isStreaming={isStreaming}
 * />
 * ```
 */
export function PiMessageList({
  messages,
  streamingMessage,
  tools = [],
  isStreaming = false,
  pendingToolCalls,
  onCostClick,
  className,
}: PiMessageListProps) {
  const ref = useRef<MessageListElement>(null);

  // 合并 messages + in-flight streaming message
  const allMessages = streamingMessage
    ? [...messages, streamingMessage]
    : messages;

  useLayoutEffect(() => {
    if (!ref.current) {
      return;
    }

    const el = ref.current;
    el.messages = allMessages;
    el.tools = tools;
    el.isStreaming = isStreaming;

    if (pendingToolCalls !== undefined) {
      el.pendingToolCalls = pendingToolCalls;
    }

    if (onCostClick) {
      el.onCostClick = onCostClick;
    }
  }, [allMessages, tools, isStreaming, pendingToolCalls, onCostClick]);

  // 使用 createElement 避免 JSX 类型问题
  return React.createElement("message-list", {
    ref,
    className: `flex-1 overflow-y-auto ${className ?? ""}`,
  });
}

export default PiMessageList;
