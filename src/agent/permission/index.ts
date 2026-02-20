/**
 * permission/index.ts - 权限模块导出
 */

export type {
  PermissionDecision,
  PermissionPolicy,
  ToolRisk,
} from "./permission-policy";
// biome-ignore lint/performance/noBarrelFile: 权限模块公开 API 边界
export {
  checkToolPermission,
  getPermissionPolicy,
  getToolRisk,
  isAllowedInPolicy,
} from "./permission-policy";

export type { PendingPermissionRequest } from "./permission-request";
export {
  cancelAllPendingRequests,
  requestPermission,
  respondToPermissionRequest,
} from "./permission-request";
