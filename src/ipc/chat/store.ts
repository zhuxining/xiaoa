// biome-ignore lint/performance/noBarrelFile: Re-export from new modular structure for backward compatibility
export {
  abortChatRun,
  followUpChatRun,
  getChatEvents,
  getModelFromConfig,
  handleAgentStreamEvent,
  knowledgeRead,
  resolveProjectRoot,
  respondChatPermission,
  shouldUsePiAgent,
  startChatRun,
  steerChatRun,
} from "./run/run-executor";
export { extractMessageText } from "./run/run-store";
export type { ActiveRun, ToolContext } from "./run/run-types";
export { createTools } from "./tools";

// Re-export memory functions for backward compatibility
export {
  appendDailyLog,
  memorySearch,
  memoryWrite,
} from "./tools/memory-tools";

import type { AgentMessage } from "@mariozechner/pi-agent-core";
import {
  maybeCompactMessages,
  preCompactionFlush,
} from "./agent/transform-context";
import { handleAgentStreamEvent } from "./run/run-executor";
import type { ActiveRun } from "./run/run-types";
// Test exports
import { appendDailyLog } from "./tools/memory-tools";

// Create a wrapper for maybeCompactMessages that matches the old signature
function maybeCompactMessagesWrapper(
  run: ActiveRun,
  messages: Array<{ role: string; content: unknown; timestamp: number }>
): Array<{ role: string; content: unknown; timestamp: number }> {
  const agentMessages = messages.map((m) => ({
    ...m,
    role: m.role as "user" | "assistant",
  })) as AgentMessage[];
  const result = maybeCompactMessages(run, agentMessages);
  return result as Array<{ role: string; content: unknown; timestamp: number }>;
}

export const __test = {
  appendDailyLog,
  maybeCompactMessages: maybeCompactMessagesWrapper,
  preCompactionFlush,
  handleAgentStreamEvent,
};
