/**
 * src/agent/run/ - 运行时模块
 *
 * 管理 Agent 对话运行的核心逻辑：
 * - run-types.ts: ActiveRun 接口定义
 * - run-store.ts: 状态管理（eventBuffers, activeRuns）
 * - run-executor.ts: AgentSessionEvent → ChatEvent 桥接
 */

// biome-ignore lint/performance/noBarrelFile: 运行时模块公开 API 边界
export {
  abortChatRun,
  bridgeEvent,
  createActiveRun,
  disposeSessionFromPool,
  endChatRun,
  followUpChatRun,
  getChatEvents,
  getContextUsage,
  getSessionStats,
  respondChatPermission,
  setActiveTools,
  startChatRun,
  steerChatRun,
} from "./run-executor";
export {
  activeRuns,
  appendEvent,
  clearEventBuffer,
  deleteActiveRun,
  extractMessageText,
  generateId,
  getActiveRun,
  getEventBuffer,
  getSessionKey,
  MAX_EVENTS_PER_SESSION,
  requireWorkspaceId,
  setActiveRun,
  sleep,
} from "./run-store";
export type { ActiveRun, ToolContext } from "./run-types";
