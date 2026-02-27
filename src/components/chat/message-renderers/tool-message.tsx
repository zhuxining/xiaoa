import type { ToolResultMessage } from "@mariozechner/pi-ai";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  Terminal,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/tailwind";

interface ToolCallData {
  arguments: Record<string, unknown>;
  id: string;
  name: string;
}

interface ToolMessageProps {
  className?: string;
  result?: ToolResultMessage;
  toolCall: ToolCallData;
}

type ToolState = "inprogress" | "complete" | "error";

const COLLAPSE_THRESHOLD = 500;

function getToolState(result?: ToolResultMessage): ToolState {
  if (!result) {
    return "inprogress";
  }
  return result.isError ? "error" : "complete";
}

function getToolIcon(toolName: string) {
  if (toolName.includes("bash") || toolName.includes("shell")) {
    return Terminal;
  }
  if (
    toolName.includes("file") ||
    toolName.includes("read") ||
    toolName.includes("write")
  ) {
    return FileText;
  }
  return Wrench;
}

function StateIcon({ state }: { state: ToolState }) {
  switch (state) {
    case "inprogress":
      return <Loader2 className="size-3 animate-spin" />;
    case "complete":
      return <CheckCircle className="size-3 text-green-500" />;
    case "error":
      return <AlertCircle className="size-3 text-destructive" />;
    default:
      return null;
  }
}

function formatOutput(result: ToolResultMessage): string | null {
  const textContents = result.content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text);

  return textContents.length > 0 ? textContents.join("\n") : null;
}

function getOutputSummary(output: string, maxLength = 80): string {
  const firstLine = output.split("\n")[0] ?? "";
  if (firstLine.length <= maxLength) {
    return firstLine;
  }
  return `${firstLine.slice(0, maxLength)}...`;
}

export function ToolMessage({ toolCall, result, className }: ToolMessageProps) {
  const state = getToolState(result);
  const Icon = getToolIcon(toolCall.name);
  const output = result ? formatOutput(result) : null;
  const [isExpanded, setIsExpanded] = useState(false);

  const shouldCollapse = output && output.length > COLLAPSE_THRESHOLD;

  const statusText = {
    inprogress: "执行中...",
    complete: "完成",
    error: "失败",
  }[state];

  const displayPath = toolCall.arguments?.path as string | undefined;

  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border bg-muted/30 p-3",
        state === "error" && "border-destructive/50",
        className
      )}
      data-slot="tool-message"
    >
      {/* 头部：状态 + 工具名 */}
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <span className="font-medium text-sm">{toolCall.name}</span>
        <div className="ml-auto flex items-center gap-1 text-muted-foreground text-xs">
          <StateIcon state={state} />
          <span>{statusText}</span>
        </div>
      </div>

      {/* 参数显示（如文件路径） */}
      {displayPath && (
        <div className="rounded bg-muted/50 px-2 py-1 font-mono text-muted-foreground text-xs">
          {displayPath}
        </div>
      )}

      {/* 输出内容 */}
      {output && (
        <div className="space-y-1">
          {shouldCollapse && !isExpanded && (
            <div className="rounded bg-muted/50 px-2 py-1 font-mono text-muted-foreground text-xs">
              {getOutputSummary(output)}
            </div>
          )}
          {(!shouldCollapse || isExpanded) && (
            <div
              className={cn(
                "max-h-60 overflow-auto whitespace-pre-wrap rounded bg-muted/50 p-2 font-mono text-xs",
                state === "error" && "text-destructive"
              )}
            >
              {output}
            </div>
          )}
          {shouldCollapse && (
            <Button
              className="h-6 px-2 text-xs"
              onClick={() => setIsExpanded(!isExpanded)}
              size="sm"
              variant="ghost"
            >
              {isExpanded ? (
                <>
                  <ChevronDown className="mr-1 size-3" />
                  收起
                </>
              ) : (
                <>
                  <ChevronRight className="mr-1 size-3" />
                  展开全部 ({output.length} 字符)
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* 等待中状态 */}
      {state === "inprogress" && !displayPath && (
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Clock className="size-3" />
          <span>等待工具执行...</span>
        </div>
      )}
    </div>
  );
}
