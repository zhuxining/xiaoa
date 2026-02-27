import type { AgentMessage, AgentTool } from "@mariozechner/pi-agent-core";
import type { ToolResultMessage } from "@mariozechner/pi-ai";
import { Bot } from "lucide-react";
import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils/tailwind";
import { AssistantMessage } from "./message-renderers/assistant-message";
import { ToolMessage } from "./message-renderers/tool-message";
import { UserMessage } from "./message-renderers/user-message";

export interface AgentMessageListProps {
  /** Agent 头像 */
  agentAvatar?: string;
  /** Agent 名称 */
  agentName?: string;
  /** 自定义类名 */
  className?: string;
  /** 是否正在流式输出 */
  isStreaming?: boolean;
  /** 消息列表 */
  messages: AgentMessage[];
  /** 流式消息（追加到 messages 末尾） */
  streamingMessage?: AgentMessage | null;
  /** 可用工具列表 */
  tools?: AgentTool[];
}

/**
 * 获取工具调用对应的结果
 */
function findToolResult(
  messages: AgentMessage[],
  toolCallId: string
): ToolResultMessage | undefined {
  for (const m of messages) {
    if (
      m.role === "toolResult" &&
      "toolCallId" in m &&
      m.toolCallId === toolCallId
    ) {
      return m as ToolResultMessage;
    }
  }
  return undefined;
}

/**
 * 判断是否为自定义消息类型
 */
function isCustomMessage(message: AgentMessage, role: string): boolean {
  return (
    !["user", "assistant", "toolResult"].includes(message.role) &&
    message.role === role
  );
}

/**
 * AgentMessageList - 纯 React 消息列表组件
 *
 * 支持渲染所有 AgentMessage 类型：
 * - user: 用户消息
 * - assistant: 助手消息
 * - toolResult: 工具结果
 * - 自定义消息类型（通过 role 字段区分）
 */
export function AgentMessageList({
  messages,
  streamingMessage,
  isStreaming = false,
  agentName = "Assistant",
  agentAvatar,
  tools: _tools = [],
  className,
}: AgentMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 合并 messages + streaming message
  const allMessages = streamingMessage
    ? [...messages, streamingMessage]
    : messages;

  // 自动滚动到底部（需要操作 Viewport 而非 Root）
  useEffect(() => {
    if (scrollRef.current && (isStreaming || allMessages.length > 0)) {
      const viewport = scrollRef.current.querySelector(
        '[data-slot="scroll-area-viewport"]'
      );
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [allMessages, isStreaming]);

  // 渲染单条消息
  const renderMessage = (message: AgentMessage, index: number) => {
    // 用户消息
    if (message.role === "user") {
      const rawContent = (message as { content?: unknown }).content;
      let textContent: string;

      if (rawContent === undefined || rawContent === null) {
        // 防御性处理：content 为空
        textContent = "";
        console.warn(
          "[agent-message-list] User message has no content:",
          message
        );
      } else if (typeof rawContent === "string") {
        textContent = rawContent;
      } else if (Array.isArray(rawContent)) {
        // content 是数组
        textContent = rawContent
          .filter(
            (c): c is { type: "text"; text: string } => c?.type === "text"
          )
          .map((c) => c.text)
          .join("\n");
      } else {
        // 未知格式
        console.warn(
          "[agent-message-list] User message has unexpected content format:",
          rawContent
        );
        textContent = String(rawContent);
      }

      return (
        <UserMessage
          content={textContent}
          key={`user-${index}`}
          timestamp={
            (message as { timestamp?: number }).timestamp ?? Date.now()
          }
        />
      );
    }

    // 助手消息
    if (message.role === "assistant") {
      return (
        <AssistantMessage
          avatar={agentAvatar}
          content={message.content}
          isStreaming={isStreaming && index === allMessages.length - 1}
          key={`assistant-${index}`}
          name={agentName}
          timestamp={message.timestamp}
        />
      );
    }

    // 工具结果（配对显示）
    if (message.role === "toolResult") {
      // 工具结果在 assistant 消息中已通过 ToolCall 渲染，这里跳过
      return null;
    }

    // 自定义消息类型 - permission_request
    if (isCustomMessage(message, "permission_request")) {
      const permMsg = message as unknown as {
        permissionTitle: string;
        permissionDescription: string;
        permissionRisk: string;
        timestamp: number;
      };
      return (
        <div
          className="rounded-lg border bg-yellow-500/10 p-3 text-sm"
          key={`permission-${index}`}
        >
          <div className="font-medium text-yellow-600 dark:text-yellow-400">
            {permMsg.permissionTitle}
          </div>
          <div className="mt-1 text-muted-foreground">
            {permMsg.permissionDescription}
          </div>
          {permMsg.permissionRisk && (
            <div className="mt-2 text-xs text-yellow-600/80">
              风险等级: {permMsg.permissionRisk}
            </div>
          )}
        </div>
      );
    }

    // 自定义消息类型 - compaction_summary
    if (isCustomMessage(message, "compaction_summary")) {
      const compactionMsg = message as unknown as {
        summary: string;
        flushedMessageCount: number;
        timestamp: number;
      };
      return (
        <div
          className="rounded-lg border bg-blue-500/10 p-3 text-sm"
          key={`compaction-${index}`}
        >
          <div className="font-medium text-blue-600 dark:text-blue-400">
            上下文压缩
          </div>
          <div className="mt-1 text-muted-foreground">
            {compactionMsg.summary}
          </div>
          <div className="mt-2 text-muted-foreground text-xs">
            已压缩 {compactionMsg.flushedMessageCount} 条消息
          </div>
        </div>
      );
    }

    // 自定义消息类型 - memory_update
    if (isCustomMessage(message, "memory_update")) {
      const memMsg = message as unknown as {
        content: string;
        timestamp: number;
      };
      return (
        <div
          className="rounded-lg border bg-green-500/10 p-3 text-sm"
          key={`memory-${index}`}
        >
          <div className="font-medium text-green-600 dark:text-green-400">
            记忆更新
          </div>
          <div className="mt-1 text-muted-foreground">{memMsg.content}</div>
        </div>
      );
    }

    // 未知消息类型 - 显示为调试信息
    return (
      <div
        className="rounded-lg border bg-muted p-3 text-muted-foreground text-sm"
        key={`unknown-${index}`}
      >
        未知消息类型: {message.role}
      </div>
    );
  };

  // 预处理消息：将 ToolCall 从 assistant 消息中提取出来
  const processedMessages: Array<{
    type: "message" | "toolCall";
    data: unknown;
    index: number;
  }> = [];

  for (let i = 0; i < allMessages.length; i++) {
    const message = allMessages[i];
    const msgContent = (message as { content?: unknown }).content;

    if (message.role === "assistant") {
      // 防御性检查：确保 content 是数组
      const contentArray = Array.isArray(msgContent) ? msgContent : [];

      // 先添加助手消息（不含 toolCall）
      const contentWithoutToolCalls = contentArray.filter(
        (c) => (c as { type?: string })?.type !== "toolCall"
      );
      if (contentWithoutToolCalls.length > 0) {
        processedMessages.push({
          type: "message",
          data: { ...message, content: contentWithoutToolCalls },
          index: i,
        });
      }

      // 然后添加每个 ToolCall（配对结果）
      const toolCalls = contentArray.filter(
        (c) => (c as { type?: string })?.type === "toolCall"
      );
      for (const toolCall of toolCalls) {
        const tc = toolCall as { id: string };
        const result = findToolResult(allMessages, tc.id);
        processedMessages.push({
          type: "toolCall",
          data: { toolCall, result },
          index: i,
        });
      }
    } else {
      processedMessages.push({ type: "message", data: message, index: i });
    }
  }

  return (
    <ScrollArea
      className={cn("min-h-0 flex-1", className)}
      data-slot="agent-message-list"
      ref={scrollRef}
    >
      <div className="flex flex-col gap-4 p-4">
        {processedMessages.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <Bot className="mx-auto mb-4 size-12 opacity-50" />
            <p className="font-medium">开始对话</p>
            <p className="mt-1 text-sm">输入消息开始与助手交流</p>
          </div>
        )}
        {processedMessages.map((item, displayIndex) => {
          if (item.type === "toolCall") {
            const { toolCall, result } = item.data as {
              toolCall: {
                id: string;
                name: string;
                arguments: Record<string, unknown>;
              };
              result: ToolResultMessage | undefined;
            };
            return (
              <ToolMessage
                key={`tool-${item.index}-${toolCall.id}`}
                result={result}
                toolCall={toolCall}
              />
            );
          }

          return (
            <div key={`msg-${item.index}-${displayIndex}`}>
              {renderMessage(item.data as AgentMessage, item.index)}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export default AgentMessageList;
