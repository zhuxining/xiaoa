/**
 * session/ - 会话生命周期管理
 *
 * - session-pool: AgentSession 长生命周期缓存
 * - session-store: 会话 CRUD（pi SessionManager 封装）
 * - workspace-session: 工作区/全局 AgentSession 创建
 */

// biome-ignore lint/performance/noBarrelFile: 会话模块公开 API 边界
export {
  disposeAll,
  disposeSession,
  getOrCreateSession,
  getPooledSession,
  hasSession,
  releaseSession,
} from "./session-pool";
export type { SessionMeta } from "./session-store";
export {
  createSession,
  deleteSession,
  getSession,
  getSessionMessages,
  listSessions,
  renameSession,
} from "./session-store";
export {
  createGlobalSession,
  createWorkspaceSession,
} from "./workspace-session";
