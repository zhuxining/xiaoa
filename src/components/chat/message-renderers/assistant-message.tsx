import type {
  ImageContent,
  TextContent,
  ThinkingContent,
  ToolCall,
} from "@mariozechner/pi-ai";
import { Bot, Loader2 } from "lucide-react";
import type React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/utils/tailwind";
import { CodeBlock } from "./code-block";

type ContentBlock = TextContent | ThinkingContent | ToolCall | ImageContent;

const LANGUAGE_CLASS_REGEX = /language-(\w+)/;
const TRAILING_NEWLINE_REGEX = /\n$/;

interface AssistantMessageProps {
  avatar?: string;
  className?: string;
  content: ContentBlock[];
  isStreaming?: boolean;
  name?: string;
  timestamp: number;
}

function renderContentBlock(
  block: ContentBlock,
  index: number
): React.ReactNode {
  switch (block.type) {
    case "text":
      return (
        <Markdown
          components={{
            code({ className, children, ...props }) {
              const match = LANGUAGE_CLASS_REGEX.exec(className || "");
              if (!match) {
                return (
                  <code
                    className="rounded bg-background/50 px-1 py-0.5 text-sm"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
              return (
                <CodeBlock
                  code={String(children).replace(TRAILING_NEWLINE_REGEX, "")}
                  language={match[1]}
                />
              );
            },
            pre({ children }) {
              return <>{children}</>;
            },
          }}
          key={`text-${index}`}
          remarkPlugins={[remarkGfm]}
        >
          {block.text}
        </Markdown>
      );

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
  // 防御性检查：确保 content 是数组
  const safeContent = Array.isArray(content) ? content : [];
  const displayContent = safeContent.filter((c) => c?.type !== "toolCall");

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
          <div className="prose prose-sm dark:prose-invert max-w-none space-y-2 rounded-lg bg-muted px-3 py-2">
            {displayContent.map((block, index) =>
              renderContentBlock(block, index)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
