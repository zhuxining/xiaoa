/**
 * session/index.ts - Session IPC 模块导出
 */

import { sessionRouter } from "./handlers";

// 导出 schemas
// biome-ignore lint/performance/noBarrelFile: session 模块公开 API 边界
export * from "./schemas";

// 导出 router（命名导出以兼容现有模式）
export const session = {
  list: sessionRouter.list,
  get: sessionRouter.get,
  getMessages: sessionRouter.getMessages,
  create: sessionRouter.create,
  delete: sessionRouter.delete,
};
