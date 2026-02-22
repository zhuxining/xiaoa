/**
 * store.ts - IPC 层重导出
 *
 * 极薄 IPC 层，重导出 src/agent/run/ 模块的公开 API。
 */

export type { ActiveRun, ToolContext } from "@/agent/run";
// biome-ignore lint/performance/noBarrelFile: IPC 层薄封装，重导出 agent/run 公开 API
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
