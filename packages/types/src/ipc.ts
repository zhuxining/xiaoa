export const IPC_CHANNELS = {
	PING: "ping",

	// LLM
	LLM_SET_KEY: "llm:setKey",
	LLM_TEST: "llm:test",
	LLM_GET_MODELS: "llm:getModels",

	// Chat
	CHAT_SEND: "chat:send",
	CHAT_STREAM_EVENT: "chat:streamEvent",
	CHAT_ABORT: "chat:abort",

	// Workspace
	WORKSPACE_GET_ALL: "workspace:getAll",
	WORKSPACE_GET: "workspace:get",
	WORKSPACE_CREATE: "workspace:create",
	WORKSPACE_UPDATE: "workspace:update",
	WORKSPACE_DELETE: "workspace:delete",
	WORKSPACE_SET_ACTIVE: "workspace:setActive",

	// Session
	SESSION_GET_ALL: "session:getAll",
	SESSION_GET: "session:get",
	SESSION_CREATE: "session:create",
	SESSION_UPDATE: "session:update",
	SESSION_DELETE: "session:delete",

	// Message
	MESSAGE_GET_ALL: "message:getAll",
	MESSAGE_CREATE: "message:create",

	// Skills
	SKILL_GET_ALL: "skill:getAll",
	SKILL_CREATE: "skill:create",
	SKILL_UPDATE: "skill:update",
	SKILL_DELETE: "skill:delete",

	// Memory
	MEMORY_GET_ALL: "memory:getAll",
	MEMORY_CREATE: "memory:create",
	MEMORY_UPDATE: "memory:update",
	MEMORY_DELETE: "memory:delete",

	// Knowledge
	KNOWLEDGE_GET_ALL: "knowledge:getAll",
	KNOWLEDGE_CREATE: "knowledge:create",
	KNOWLEDGE_UPDATE: "knowledge:update",
	KNOWLEDGE_DELETE: "knowledge:delete",

	// Projects
	PROJECT_GET_ALL: "project:getAll",
	PROJECT_CREATE: "project:create",
	PROJECT_DELETE: "project:delete",
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
