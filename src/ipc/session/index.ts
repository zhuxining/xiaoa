/**
 * session/index.ts - Session IPC 模块导出
 */

import { sessionRouter } from "./handlers";

// biome-ignore lint/performance/noBarrelFile: session 模块公开 API 边界
export * from "./schemas";

export const session = {
  list: sessionRouter.list,
  get: sessionRouter.get,
  getMessages: sessionRouter.getMessages,
  create: sessionRouter.create,
  delete: sessionRouter.delete,
};
