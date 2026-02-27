import type { AgentMessage, AgentTool } from "@mariozechner/pi-agent-core";
import type {
  AssistantMessage as PiAssistantMessage,
  ToolResultMessage,
} from "@mariozechner/pi-ai";
import { Bot } from "lucide-react";
import { useCallback, useState } from "react";
import {
  Checkpoint,
  CheckpointIcon,
  CheckpointTrigger,
} from "@/components/ai-elements/checkpoint";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { cn } from "@/utils/tailwind";
import {
  extractThinkingContent,
  shouldShowReasoning,
  type ThinkingLevel,
} from "./adapters/reasoning-adapter";
import { AssistantMessage } from "./message-renderers/assistant-message";
import { ToolMessage } from "./message-renderers/tool-message";
import { UserMessage } from "./message-renderers/user-message";

export interface AgentMessageListProps {
  agentAvatar?: string;
  agentName?: string;
  className?: string;
  isStreaming?: boolean;
  messages: AgentMessage[];
  streamingMessage?: AgentMessage | null;
  thinkingLevel?: ThinkingLevel;
  tools?: AgentTool[];
}

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

function isCustomMessage(message: AgentMessage, role: string): boolean {
  return (
    !["user", "assistant", "toolResult"].includes(message.role) &&
    message.role === role
  );
}

function isStreamingMessageRedundant(
  messages: AgentMessage[],
  streamingMsg: AgentMessage | null
): boolean {
  if (!streamingMsg || messages.length === 0) {
    return false;
  }
  const lastMessage = messages.at(-1);
  if (
    lastMessage?.role === "assistant" &&
    lastMessage.timestamp >= streamingMsg.timestamp
  ) {
    return true;
  }
  return false;
}

function extractUserTextContent(message: AgentMessage): string {
  const rawContent = (message as { content?: unknown }).content;
  if (rawContent === undefined || rawContent === null) {
    return "";
  }
  if (typeof rawContent === "string") {
    return rawContent;
  }
  if (Array.isArray(rawContent)) {
    return rawContent
      .filter((c): c is { type: "text"; text: string } => c?.type === "text")
      .map((c) => c.text)
      .join("\n");
  }
  return String(rawContent);
}

interface ProcessedItem {
  data: unknown;
  index: number;
  type: "message" | "toolCall";
}

function processMessages(allMessages: AgentMessage[]): ProcessedItem[] {
  const result: ProcessedItem[] = [];

  for (let i = 0; i < allMessages.length; i++) {
    const message = allMessages[i];
    const msgContent = (message as { content?: unknown }).content;

    if (message.role === "assistant") {
      const contentArray = Array.isArray(msgContent) ? msgContent : [];
      const contentWithoutToolCalls = contentArray.filter(
        (c) => (c as { type?: string })?.type !== "toolCall"
      );
      if (contentWithoutToolCalls.length > 0) {
        result.push({
          type: "message",
          data: { ...message, content: contentWithoutToolCalls },
          index: i,
        });
      }

      const toolCalls = contentArray.filter(
        (c) => (c as { type?: string })?.type === "toolCall"
      );
      for (const toolCall of toolCalls) {
        const tc = toolCall as { id: string };
        const toolResult = findToolResult(allMessages, tc.id);
        result.push({
          type: "toolCall",
          data: { toolCall, result: toolResult },
          index: i,
        });
      }
    } else {
      result.push({ type: "message", data: message, index: i });
    }
  }

  return result;
}

function UserMessageItem({ message }: { message: AgentMessage }) {
  return (
    <UserMessage
      content={extractUserTextContent(message)}
      timestamp={(message as { timestamp?: number }).timestamp ?? Date.now()}
    />
  );
}

function AssistantMessageItem({
  message,
  agentName,
  agentAvatar,
  isStreaming,
}: {
  message: AgentMessage;
  agentName: string;
  agentAvatar?: string;
  isStreaming: boolean;
}) {
  const assistantMsg = message as unknown as PiAssistantMessage;
  return (
    <AssistantMessage
      avatar={agentAvatar}
      content={assistantMsg.content}
      isStreaming={isStreaming}
      name={agentName}
      timestamp={message.timestamp}
    />
  );
}

function PermissionMessage({ message }: { message: AgentMessage }) {
  const permMsg = message as unknown as {
    permissionTitle: string;
    permissionDescription: string;
    permissionRisk: string;
  };
  return (
    <div
      className="rounded-lg border bg-yellow-500/10 p-3 text-sm"
      role="alert"
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

function CompactionCheckpoint({ message }: { message: AgentMessage }) {
  const compactionMsg = message as unknown as {
    summary: string;
    flushedMessageCount: number;
  };
  return (
    <Checkpoint>
      <CheckpointIcon />
      <CheckpointTrigger
        tooltip={`${compactionMsg.summary} (已压缩 ${compactionMsg.flushedMessageCount} 条消息)`}
      >
        上下文压缩 · {compactionMsg.flushedMessageCount} 条消息
      </CheckpointTrigger>
    </Checkpoint>
  );
}

function MemoryMessage({ message }: { message: AgentMessage }) {
  const memMsg = message as unknown as { content: string };
  return (
    <div className="rounded-lg border bg-green-500/10 p-3 text-sm">
      <div className="font-medium text-green-600 dark:text-green-400">
        记忆更新
      </div>
      <div className="mt-1 text-muted-foreground">{memMsg.content}</div>
    </div>
  );
}

function ToolCallItem({
  toolCall,
  result,
}: {
  toolCall: { id: string; name: string; arguments: Record<string, unknown> };
  result: ToolResultMessage | undefined;
}) {
  return <ToolMessage result={result} toolCall={toolCall} />;
}

function MessageItem({
  message,
  index,
  allMessages,
  agentName,
  agentAvatar,
  isStreaming,
  isRedundant,
}: {
  message: AgentMessage;
  index: number;
  allMessages: AgentMessage[];
  agentName: string;
  agentAvatar?: string;
  isStreaming: boolean;
  isRedundant: boolean;
}) {
  if (message.role === "user") {
    return <UserMessageItem message={message} />;
  }

  if (message.role === "assistant") {
    const isActuallyStreaming =
      isStreaming && !isRedundant && index === allMessages.length - 1;
    return (
      <AssistantMessageItem
        agentAvatar={agentAvatar}
        agentName={agentName}
        isStreaming={isActuallyStreaming}
        message={message}
      />
    );
  }

  if (message.role === "toolResult") {
    return null;
  }

  if (isCustomMessage(message, "permission_request")) {
    return <PermissionMessage message={message} />;
  }

  if (isCustomMessage(message, "compaction_summary")) {
    return <CompactionCheckpoint message={message} />;
  }

  if (isCustomMessage(message, "memory_update")) {
    return <MemoryMessage message={message} />;
  }

  return (
    <div className="rounded-lg border bg-muted p-3 text-muted-foreground text-sm">
      未知消息类型: {message.role}
    </div>
  );
}

function getNewFocusedIndex(
  focusedIndex: number | null,
  direction: number,
  maxLength: number
): number {
  if (focusedIndex === null) {
    return direction === 1 ? 0 : maxLength - 1;
  }
  return Math.max(0, Math.min(maxLength - 1, focusedIndex + direction));
}

export function AgentMessageList({
  messages,
  streamingMessage,
  isStreaming = false,
  thinkingLevel = "minimal",
  agentName = "Assistant",
  agentAvatar,
  tools: _tools = [],
  className,
}: AgentMessageListProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const isRedundant = isStreamingMessageRedundant(
    messages,
    streamingMessage ?? null
  );
  const allMessages =
    streamingMessage && !isRedundant
      ? [...messages, streamingMessage]
      : messages;

  const processedMessages = processMessages(allMessages);

  const showReasoning = shouldShowReasoning(thinkingLevel);

  const lastAssistantMessage = allMessages
    .filter((m): m is PiAssistantMessage => m.role === "assistant")
    .at(-1);

  const reasoningContent =
    showReasoning && lastAssistantMessage
      ? extractThinkingContent(lastAssistantMessage.content, isStreaming)
      : null;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const direction = e.key === "ArrowDown" ? 1 : -1;
        const newIndex = getNewFocusedIndex(
          focusedIndex,
          direction,
          processedMessages.length
        );
        setFocusedIndex(newIndex);
      } else if (e.key === "Home") {
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setFocusedIndex(processedMessages.length - 1);
      }
    },
    [focusedIndex, processedMessages.length]
  );

  return (
    <Conversation
      aria-label="消息列表"
      className={cn("min-h-0 flex-1", className)}
      data-slot="agent-message-list"
      onKeyDown={handleKeyDown}
      role="log"
      tabIndex={0}
    >
      <ConversationContent>
        {processedMessages.length === 0 && (
          <ConversationEmptyState
            description="输入消息开始与助手交流"
            icon={<Bot className="size-12 opacity-50" />}
            title="开始对话"
          />
        )}
        {showReasoning && reasoningContent && (
          <Reasoning
            defaultOpen={reasoningContent.isStreaming}
            isStreaming={reasoningContent.isStreaming}
          >
            <ReasoningTrigger />
            <ReasoningContent>{reasoningContent.content}</ReasoningContent>
          </Reasoning>
        )}
        {processedMessages.map((item, displayIndex) => {
          const isFocused = focusedIndex === displayIndex;

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
              <article
                aria-label={`工具调用: ${toolCall.name}`}
                className={cn(isFocused && "rounded-lg ring-2 ring-ring/30")}
                key={`tool-${item.index}-${toolCall.id}`}
                tabIndex={-1}
              >
                <ToolCallItem result={result} toolCall={toolCall} />
              </article>
            );
          }

          const message = item.data as AgentMessage;
          return (
            <article
              aria-label={
                message.role === "user" ? "用户消息" : `${agentName} 消息`
              }
              className={cn(isFocused && "rounded-lg ring-2 ring-ring/30")}
              key={`msg-${item.index}-${displayIndex}`}
              tabIndex={-1}
            >
              <MessageItem
                agentAvatar={agentAvatar}
                agentName={agentName}
                allMessages={allMessages}
                index={item.index}
                isRedundant={isRedundant}
                isStreaming={isStreaming}
                message={message}
              />
            </article>
          );
        })}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

export default AgentMessageList;
