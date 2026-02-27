import type {
  ImageContent,
  TextContent,
  ThinkingContent,
  ToolCall,
} from "@mariozechner/pi-ai";
import { Bot, Copy, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import type React from "react";
import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/utils/tailwind";
import { CodeBlock } from "./code-block";

type ContentBlock = TextContent | ThinkingContent | ToolCall | ImageContent;
type FeedbackType = "positive" | "negative" | null;

const LANGUAGE_CLASS_REGEX = /language-(\w+)/;
const TRAILING_NEWLINE_REGEX = /\n$/;

interface AssistantMessageProps {
  avatar?: string;
  className?: string;
  content: ContentBlock[];
  isStreaming?: boolean;
  name?: string;
  onFeedback?: (type: FeedbackType) => void;
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

function extractTextContent(content: ContentBlock[]): string {
  return content
    .filter((c): c is TextContent => c.type === "text")
    .map((c) => c.text)
    .join("\n");
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);

  if (minutes < 1) {
    return "刚刚";
  }
  if (minutes < 60) {
    return `${minutes} 分钟前`;
  }
  if (hours < 24) {
    return `${hours} 小时前`;
  }
  return new Date(timestamp).toLocaleDateString();
}

export function AssistantMessage({
  content,
  timestamp,
  name = "Assistant",
  avatar,
  isStreaming = false,
  onFeedback,
  className,
}: AssistantMessageProps) {
  const safeContent = Array.isArray(content) ? content : [];
  const displayContent = safeContent.filter((c) => c?.type !== "toolCall");
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const textContent = extractTextContent(safeContent);
    if (textContent) {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFeedback = (type: FeedbackType) => {
    setFeedback(feedback === type ? null : type);
    onFeedback?.(type);
    toast.success(
      type === "positive" ? "感谢您的反馈！" : "感谢反馈，我们会持续改进"
    );
  };

  return (
    <div
      className={cn("group flex gap-3", className)}
      data-slot="assistant-message"
    >
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default text-muted-foreground text-xs">
                  {formatRelativeTime(timestamp)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {new Date(timestamp).toLocaleString()}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {/* 操作按钮 - hover 显示 */}
          {!isStreaming && displayContent.length > 0 && (
            <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="h-6 w-6"
                      onClick={handleCopy}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <Copy
                        className={cn("size-3", copied && "text-green-500")}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{copied ? "已复制" : "复制"}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className={cn(
                        "h-6 w-6",
                        feedback === "positive" && "text-green-500"
                      )}
                      onClick={() => handleFeedback("positive")}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <ThumbsUp className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>有帮助</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className={cn(
                        "h-6 w-6",
                        feedback === "negative" && "text-destructive"
                      )}
                      onClick={() => handleFeedback("negative")}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <ThumbsDown className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>需要改进</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
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
