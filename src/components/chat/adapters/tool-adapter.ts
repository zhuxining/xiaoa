import type { ToolResultMessage } from "@mariozechner/pi-ai";
import type { DynamicToolUIPart } from "ai";

export interface ToolCallData {
  arguments: Record<string, unknown>;
  id: string;
  name: string;
}

export interface AdaptedToolCall {
  errorText: string | null;
  input: Record<string, unknown>;
  output: unknown;
  state: DynamicToolUIPart["state"];
  toolName: string;
  type: "dynamic-tool";
}

export function toToolPart(
  toolCall: ToolCallData,
  result?: ToolResultMessage
): AdaptedToolCall {
  return {
    type: "dynamic-tool",
    toolName: toolCall.name,
    state: mapToolState(result),
    input: toolCall.arguments,
    output: result ? formatResult(result) : null,
    errorText: result?.isError ? extractErrorText(result) : null,
  };
}

function mapToolState(result?: ToolResultMessage): DynamicToolUIPart["state"] {
  if (!result) {
    return "input-available";
  }
  if (result.isError) {
    return "output-error";
  }
  return "output-available";
}

function formatResult(result: ToolResultMessage): unknown {
  const textContents = result.content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text);
  if (textContents.length > 1) {
    return textContents;
  }
  return textContents[0] ?? "";
}

function extractErrorText(result: ToolResultMessage): string {
  const errorContent = result.content.find(
    (c): c is { type: "text"; text: string } => c.type === "text"
  );
  if (errorContent) {
    return errorContent.text;
  }
  return "执行失败";
}

export function getToolStatusBadge(state: DynamicToolUIPart["state"]): {
  label: string;
  variant: "default" | "secondary" | "destructive";
} {
  switch (state) {
    case "input-available": {
      return { label: "执行中", variant: "secondary" };
    }
    case "output-available": {
      return { label: "完成", variant: "default" };
    }
    case "output-error": {
      return { label: "失败", variant: "destructive" };
    }
    case "input-streaming": {
      return { label: "等待中", variant: "secondary" };
    }
    default: {
      return { label: "未知", variant: "secondary" };
    }
  }
}
