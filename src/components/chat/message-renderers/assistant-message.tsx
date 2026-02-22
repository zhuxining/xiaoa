import type {
  ImageContent,
  TextContent,
  ThinkingContent,
  ToolCall,
} from "@mariozechner/pi-ai";
import { Bot, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/utils/tailwind";
import { CodeBlock } from "./code-block";

type ContentBlock = TextContent | ThinkingContent | ToolCall | ImageContent;

interface AssistantMessageProps {
  avatar?: string;
  className?: string;
  content: ContentBlock[];
  isStreaming?: boolean;
  name?: string;
  timestamp: number;
}

/**
 * 解析文本内容，提取代码块
 */
function parseContent(
  text: string
): Array<{ type: "code" | "text"; content: string; language?: string }> {
  const parts: Array<{
    type: "code" | "text";
    content: string;
    language?: string;
  }> = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // biome-ignore lint/suspicious/noAssignInExpressions: 正则表达式匹配模式
  while ((match = codeBlockRegex.exec(text)) !== null) {
    // 添加代码块前的文本
    if (match.index > lastIndex) {
      const textContent = text.slice(lastIndex, match.index).trim();
      if (textContent) {
        parts.push({ type: "text", content: textContent });
      }
    }
    // 添加代码块
    parts.push({
      type: "code",
      content: match[2].trim(),
      language: match[1] || undefined,
    });
    lastIndex = match.index + match[0].length;
  }

  // 添加最后的文本
  if (lastIndex < text.length) {
    const textContent = text.slice(lastIndex).trim();
    if (textContent) {
      parts.push({ type: "text", content: textContent });
    }
  }

  return parts.length > 0 ? parts : [{ type: "text", content: text }];
}

function renderContentBlock(
  block: ContentBlock,
  index: number
): React.ReactNode {
  switch (block.type) {
    case "text": {
      const parts = parseContent(block.text);
      return parts.map((part, i) => {
        // 使用内容的前 20 字符作为 key 的一部分，保证稳定性
        const contentKey = part.content.slice(0, 20).replace(/\s/g, "_");
        if (part.type === "code") {
          return (
            <CodeBlock
              code={part.content}
              key={`code-${index}-${i}-${contentKey}`}
              language={part.language}
            />
          );
        }
        return (
          <div
            className="whitespace-pre-wrap text-sm"
            key={`text-${index}-${i}-${contentKey}`}
          >
            {part.content}
          </div>
        );
      });
    }

    case "thinking":
      return (
        <div
          className="border-muted-foreground/30 border-l-2 pl-3 text-muted-foreground text-sm italic"
          key={index}
        >
          {block.thinking}
        </div>
      );

    case "image":
      return (
        <img
          alt="Attachment"
          className="max-w-full rounded-lg"
          height={200}
          key={index}
          src={`data:${block.mimeType};base64,${block.data}`}
          width={300}
        />
      );

    case "toolCall":
      // ToolCall 在 AgentMessageList 中单独渲染
      return null;

    default:
      return null;
  }
}

export function AssistantMessage({
  content,
  timestamp,
  name = "Assistant",
  avatar,
  isStreaming = false,
  className,
}: AssistantMessageProps) {
  // 过滤掉 toolCall（单独渲染）
  const displayContent = content.filter((c) => c.type !== "toolCall");

  return (
    <div className={cn("flex gap-3", className)} data-slot="assistant-message">
      <Avatar size="sm">
        <AvatarImage src={avatar} />
        <AvatarFallback>
          {isStreaming ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Bot className="size-3" />
          )}
        </AvatarFallback>
      </Avatar>
      <div className="flex max-w-[80%] flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{name}</span>
          <span className="text-muted-foreground text-xs">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        </div>
        {displayContent.length > 0 && (
          <div className="space-y-2 rounded-lg bg-muted px-3 py-2">
            {displayContent.map((block, index) =>
              renderContentBlock(block, index)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
