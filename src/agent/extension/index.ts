/**
 * extension/ - Extension 钩子体系
 *
 * - extension-factory: 小A ExtensionFactory（before_agent_start / tool_call 等钩子）
 * - permission: 工具权限请求/响应管理
 * - system-prompt: 系统 Prompt 动态组装
 */

// biome-ignore lint/performance/noBarrelFile: 扩展模块公开 API 边界
export { createXiaoaExtension } from "./extension-factory";
export type { PermissionResult } from "./permission";
export {
  cancelPendingPermissions,
  requestPermission,
  respondToPermission,
} from "./permission";
export {
  composeGlobalSystemPrompt,
  composeWorkspaceSystemPrompt,
} from "./system-prompt";
