import type { ToolResultMessage } from "@mariozechner/pi-ai";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  Terminal,
  Wrench,
} from "lucide-react";
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

function getToolState(result?: ToolResultMessage): ToolState {
  if (!result) {
    return "inprogress";
  }
  return result.isError ? "error" : "complete";
}

function getToolIcon(toolName: string) {
  // 根据工具名称选择图标
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

export function ToolMessage({ toolCall, result, className }: ToolMessageProps) {
  const state = getToolState(result);
  const Icon = getToolIcon(toolCall.name);
  const output = result ? formatOutput(result) : null;

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
        <div
          className={cn(
            "max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted/50 p-2 font-mono text-xs",
            state === "error" && "text-destructive"
          )}
        >
          {output}
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
