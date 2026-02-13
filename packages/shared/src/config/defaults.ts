import type {
	AgentConfig,
	GlobalConfig,
	WorkspacePermissions,
} from "@xiaoa/types";

/** 全局配置默认值 */
export const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
	activeWorkspaceId: null,
	llm: {
		provider: "anthropic",
		model: "claude-sonnet-4-5",
	},
	preferences: {
		theme: "system",
		language: "zh-CN",
	},
	memoryLimit: 5000,
};

/** Agent 配置默认值 */
export const DEFAULT_AGENT_CONFIG: AgentConfig = {
	name: "Agent",
	systemPrompt: "你是一个有用的AI助手。",
	model: "claude-sonnet-4-5",
};

/** 工作区权限默认值 */
export const DEFAULT_WORKSPACE_PERMISSIONS: WorkspacePermissions = {
	mode: "review",
	dangerousAutoConfirm: false,
};

/** 获取全局配置默认值 */
export function defaultGlobalConfig(): GlobalConfig {
	return DEFAULT_GLOBAL_CONFIG;
}
