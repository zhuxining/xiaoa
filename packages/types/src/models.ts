// GlobalConfig - 应用级全局配置
export interface GlobalConfig {
	activeWorkspaceId: string | null;
	llm: LLMConfig;
	preferences: AppPreferences;
	memoryLimit: number;
}

export interface LLMConfig {
	provider: "anthropic" | "openai" | "openrouter" | "ollama" | "custom";
	apiKey?: string;
	model: string;
	endpoint?: string;
}

export interface AppPreferences {
	theme: "light" | "dark" | "system";
	language: string;
}

// Workspace - 工作区
export interface Workspace {
	id: string;
	name: string;
	agent: AgentConfig;
	permissions: WorkspacePermissions;
	createdAt: number;
	updatedAt: number;
}

export interface AgentConfig {
	name: string;
	avatar?: string;
	systemPrompt: string;
	model: string;
	temperature?: number;
}

export interface WorkspacePermissions {
	mode: "explore" | "review" | "auto";
	dangerousAutoConfirm: boolean;
}

// Session - 对话
export interface Session {
	id: string;
	projectId: string | null; // null = 小A全局会话
	title: string;
	createdAt: number;
	updatedAt: number;
}

// Message - 消息
export type MessageRole = "user" | "assistant";

export interface Message {
	id: string;
	sessionId: string;
	role: MessageRole;
	content: string;
	timestamp: number;
	attachments?: Attachment[];
}

// Attachment - 消息附件
export interface Attachment {
	name: string;
	path: string;
	mimeType?: string;
}

// Skill - Agent Skills 标准格式
export interface Skill {
	name: string;
	workspaceId: string;
	description: string;
	icon?: string;
	argumentHint?: string;
	invocation: SkillInvocation;
	instructions: string;
	references?: SkillReference[];
}

export type SkillInvocation = "both" | "user-only" | "model-only";

export interface SkillReference {
	name: string;
	path: string;
}

// Memory - 持久化上下文
export interface Memory {
	id: string;
	workspaceId: string;
	category: string;
	origin: MemoryOrigin;
	priority: MemoryPriority;
	refs: number;
	content: string;
	createdAt: number;
	updatedAt: number;
	lastReferencedAt?: number;
}

export type MemoryOrigin = "user" | "auto";
export type MemoryPriority = "low" | "normal" | "high" | "pinned";

// Knowledge - 知识库条目
export interface Knowledge {
	id: string;
	workspaceId: string;
	name: string;
	description: string;
	source: KnowledgeSource;
	originalPath?: string;
	originalUrl?: string;
	mimeType?: string;
	parsedFile: string;
	status: KnowledgeStatus;
	error?: string;
	addedAt: number;
	parsedAt?: number;
}

export type KnowledgeSource = "local" | "url";
export type KnowledgeStatus = "pending" | "parsing" | "ready" | "error";

// Project - 本地文件夹项目
export interface Project {
	id: string;
	workspaceId: string;
	name: string;
	path: string;
}

// ProjectDirectory - 项目目录结构
export interface ProjectDirectory {
	path: string;
	name: string;
	type: "file" | "directory";
	children?: ProjectDirectory[];
}

// PermissionMode - 权限模式
export type PermissionMode = "explore" | "review" | "auto";

// PermissionRequest - 权限请求
export interface PermissionRequest {
	sessionId: string;
	action: string;
	details: string;
}

// KnowledgeStatusUpdate - 知识库状态更新
export interface KnowledgeStatusUpdate {
	id: string;
	status: KnowledgeStatus;
	error?: string;
}

// StreamEvent - 流式对话事件
export interface StreamEvent {
	type:
		| "text_start"
		| "text_delta"
		| "text_end"
		| "tool_call"
		| "done"
		| "error";
	sessionId: string;
	content?: string;
	toolCall?: {
		id: string;
		name: string;
		arguments: Record<string, unknown>;
	};
	error?: string;
}

// ToolCall - 工具调用
export interface ToolCall {
	id: string;
	name: string;
	arguments: Record<string, unknown>;
}
