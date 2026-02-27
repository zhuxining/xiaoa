import type { AssistantMessage } from "@mariozechner/pi-ai";

export interface AdaptedReasoning {
  content: string;
  isStreaming: boolean;
}

export type ThinkingLevel =
  | "off"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh";

export function extractThinkingContent(
  content: AssistantMessage["content"],
  isStreaming: boolean
): AdaptedReasoning | null {
  const thinkingBlocks = content.filter(
    (c): c is Extract<typeof c, { type: "thinking" }> => c.type === "thinking"
  );

  if (thinkingBlocks.length === 0) {
    return null;
  }

  return {
    content: thinkingBlocks.map((b) => b.thinking).join("\n"),
    isStreaming,
  };
}

export function shouldShowReasoning(thinkingLevel: ThinkingLevel): boolean {
  return thinkingLevel !== "off";
}

export function getThinkingLevelLabel(level: ThinkingLevel): string {
  switch (level) {
    case "off":
      return "关闭思考";
    case "minimal":
      return "简洁思考";
    case "low":
      return "轻度思考";
    case "medium":
      return "中度思考";
    case "high":
      return "深度思考";
    case "xhigh":
      return "极致思考";
    default:
      return "思考";
  }
}

export const THINKING_LEVELS: ThinkingLevel[] = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
];
