import type { LanguageModelUsage } from "ai";
import type { ContextProps } from "@/components/ai-elements/context";

export interface SessionStats {
  cost: number;
  tokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
}

export interface ContextUsage {
  contextWindow: number;
  percent: number | null;
  tokens: number | null;
}

export function toContextProps(
  stats: SessionStats | null,
  usage: ContextUsage | null,
  modelId?: string
): ContextProps | null {
  if (!usage) {
    return null;
  }

  return {
    usedTokens: usage.tokens ?? 0,
    maxTokens: usage.contextWindow,
    usage: {
      inputTokens: stats?.tokens.input ?? 0,
      outputTokens: stats?.tokens.output ?? 0,
      cachedInputTokens: stats?.tokens.cacheRead ?? 0,
    } as LanguageModelUsage,
    modelId,
  };
}

export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}
