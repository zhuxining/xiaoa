/**
 * store.ts - IPC 层重导出
 *
 * 极薄 IPC 层，重导出 src/agent/run/ 模块的公开 API。
 * 旧代码（agent/, tools/, permission/, run/）将逐步废弃。
 */

export type { ActiveRun, PendingPermission, ToolContext } from "@/agent/run";
// Core run functions
export {
  abortChatRun,
  activeRuns,
  appendEvent,
  bridgeEvent,
  createActiveRun,
  endChatRun,
  followUpChatRun,
  generateId,
  getActiveRun,
  getChatEvents,
  getSessionKey,
  respondChatPermission,
  startChatRun,
  steerChatRun,
} from "@/agent/run";
// Legacy agent functions (will be migrated to src/agent/)
export {
  getModelFromConfig,
  knowledgeRead,
  resolveProjectRoot,
  shouldUsePiAgent,
} from "./agent/create-agent";
export { handleAgentStreamEvent } from "./run/run-executor";
// Legacy exports for backward compatibility
// These will be removed after full migration
export { createTools } from "./tools";
export {
  appendDailyLog,
  memorySearch,
  memoryWrite,
} from "./tools/memory-tools";

// Test exports
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { ActiveRun } from "@/agent/run";
import {
  maybeCompactMessages,
  preCompactionFlush,
} from "./agent/transform-context";
import { handleAgentStreamEvent } from "./run/run-executor";
import { appendDailyLog } from "./tools/memory-tools";

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
