export interface ElectronAPI {
	getVersions: () => {
		name: string;
		version: string;
		node: string;
		chrome: string;
		electron: string;
	};
	ping: () => Promise<string>;

	// LLM
	llm: {
		setKey: (apiKey: string) => Promise<void>;
		test: () => Promise<string[]>;
		getModels: (
			provider: import("./models").LLMConfig["provider"],
		) => Promise<string[]>;
	};

	// Chat
	chat: {
		send: (params: {
			workspaceId: string;
			message: string;
			sessionId: string;
			attachments?: Array<{ name: string; path: string }>;
			invokedSkillId?: string;
		}) => Promise<void>;
		onStreamEvent: (
			callback: (event: import("./models").StreamEvent) => void,
		) => () => void;
		abort: (sessionId: string) => Promise<void>;
	};

	// Workspace
	workspace: {
		getAll: () => Promise<import("./models").Workspace[]>;
		get: (id: string) => Promise<import("./models").Workspace | undefined>;
		create: (
			workspace: Omit<
				import("./models").Workspace,
				"id" | "createdAt" | "updatedAt"
			>,
		) => Promise<void>;
		update: (
			id: string,
			updates: Partial<import("./models").Workspace>,
		) => Promise<void>;
		delete: (id: string) => Promise<void>;
		setActive: (id: string) => Promise<void>;
	};

	// Session
	session: {
		getAll: (workspaceId: string) => Promise<import("./models").Session[]>;
		get: (
			workspaceId: string,
			sessionId: string,
		) => Promise<import("./models").Session | undefined>;
		create: (
			workspaceId: string,
			session: Omit<
				import("./models").Session,
				"id" | "createdAt" | "updatedAt"
			>,
		) => Promise<void>;
		update: (
			workspaceId: string,
			session: import("./models").Session,
		) => Promise<void>;
		delete: (workspaceId: string, sessionId: string) => Promise<void>;
	};

	// Message
	message: {
		getAll: (
			workspaceId: string,
			sessionId: string,
		) => Promise<import("./models").Message[]>;
		create: (
			workspaceId: string,
			sessionId: string,
			message: Omit<import("./models").Message, "id" | "timestamp">,
		) => Promise<void>;
	};

	// Skills
	skill: {
		getAll: (workspaceId: string) => Promise<import("./models").Skill[]>;
		create: (
			workspaceId: string,
			skill: Omit<import("./models").Skill, "workspaceId">,
		) => Promise<void>;
		update: (
			workspaceId: string,
			skill: import("./models").Skill,
		) => Promise<void>;
		delete: (workspaceId: string, skillName: string) => Promise<void>;
	};

	// Memory
	memory: {
		getAll: (workspaceId: string) => Promise<import("./models").Memory[]>;
		create: (
			workspaceId: string,
			memory: Omit<import("./models").Memory, "id" | "createdAt" | "updatedAt">,
		) => Promise<void>;
		update: (
			workspaceId: string,
			memory: import("./models").Memory,
		) => Promise<void>;
		delete: (workspaceId: string, memoryId: string) => Promise<void>;
	};

	// Knowledge
	knowledge: {
		getAll: (workspaceId: string) => Promise<import("./models").Knowledge[]>;
		create: (
			workspaceId: string,
			knowledge: Omit<
				import("./models").Knowledge,
				"id" | "addedAt" | "parsedAt"
			>,
		) => Promise<void>;
		update: (
			workspaceId: string,
			knowledge: import("./models").Knowledge,
		) => Promise<void>;
		delete: (workspaceId: string, knowledgeId: string) => Promise<void>;
	};

	// Projects
	project: {
		getAll: (workspaceId: string) => Promise<import("./models").Project[]>;
		create: (
			workspaceId: string,
			project: Omit<import("./models").Project, "id">,
		) => Promise<void>;
		delete: (workspaceId: string, projectId: string) => Promise<void>;
	};
}
