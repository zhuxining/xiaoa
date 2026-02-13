import { IPC_CHANNELS } from "@xiaoa/types";
import { app, contextBridge, ipcRenderer } from "electron";
import { APP_NAME } from "../shared/constants";

const api = {
	getVersions: () => ({
		name: APP_NAME,
		version: app.getVersion(),
		node: process.versions.node,
		chrome: process.versions.chrome,
		electron: process.versions.electron,
	}),

	ping: () => ipcRenderer.invoke(IPC_CHANNELS.PING),

	// LLM
	llm: {
		setKey: (apiKey: string) =>
			ipcRenderer.invoke(IPC_CHANNELS.LLM_SET_KEY, apiKey),
		test: () => ipcRenderer.invoke(IPC_CHANNELS.LLM_TEST),
		getModels: (provider: import("@xiaoa/types").LLMConfig["provider"]) =>
			ipcRenderer.invoke(IPC_CHANNELS.LLM_GET_MODELS, provider),
	},

	// Chat
	chat: {
		send: (params: {
			workspaceId: string;
			message: string;
			sessionId: string;
			attachments?: Array<{ name: string; path: string }>;
			invokedSkillId?: string;
		}) => ipcRenderer.invoke(IPC_CHANNELS.CHAT_SEND, params),
		onStreamEvent: (
			callback: (event: import("@xiaoa/types").StreamEvent) => void,
		) => {
			const listener = (_event: unknown, data: unknown) => {
				callback(data as import("@xiaoa/types").StreamEvent);
			};
			ipcRenderer.on(IPC_CHANNELS.CHAT_STREAM_EVENT, listener);
			return () =>
				ipcRenderer.removeListener(IPC_CHANNELS.CHAT_STREAM_EVENT, listener);
		},
		abort: (sessionId: string) =>
			ipcRenderer.invoke(IPC_CHANNELS.CHAT_ABORT, sessionId),
	},

	// Workspace
	workspace: {
		getAll: () => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_GET_ALL),
		get: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_GET, id),
		create: (
			workspace: Omit<
				import("@xiaoa/types").Workspace,
				"id" | "createdAt" | "updatedAt"
			>,
		) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_CREATE, workspace),
		update: (id: string, updates: Partial<import("@xiaoa/types").Workspace>) =>
			ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_UPDATE, { id, ...updates }),
		delete: (id: string) =>
			ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_DELETE, id),
		setActive: (id: string) =>
			ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_SET_ACTIVE, id),
	},

	// Session
	session: {
		getAll: (workspaceId: string) =>
			ipcRenderer.invoke(IPC_CHANNELS.SESSION_GET_ALL, workspaceId),
		get: (workspaceId: string, sessionId: string) =>
			ipcRenderer.invoke(IPC_CHANNELS.SESSION_GET, { workspaceId, sessionId }),
		create: (
			workspaceId: string,
			session: Omit<
				import("@xiaoa/types").Session,
				"id" | "createdAt" | "updatedAt"
			>,
		) =>
			ipcRenderer.invoke(IPC_CHANNELS.SESSION_CREATE, { workspaceId, session }),
		update: (workspaceId: string, session: import("@xiaoa/types").Session) =>
			ipcRenderer.invoke(IPC_CHANNELS.SESSION_UPDATE, { workspaceId, session }),
		delete: (workspaceId: string, sessionId: string) =>
			ipcRenderer.invoke(IPC_CHANNELS.SESSION_DELETE, {
				workspaceId,
				sessionId,
			}),
	},

	// Message
	message: {
		getAll: (workspaceId: string, sessionId: string) =>
			ipcRenderer.invoke(IPC_CHANNELS.MESSAGE_GET_ALL, {
				workspaceId,
				sessionId,
			}),
		create: (
			workspaceId: string,
			sessionId: string,
			message: Omit<import("@xiaoa/types").Message, "id" | "timestamp">,
		) =>
			ipcRenderer.invoke(IPC_CHANNELS.MESSAGE_CREATE, {
				workspaceId,
				sessionId,
				message,
			}),
	},

	// Skills
	skill: {
		getAll: (workspaceId: string) =>
			ipcRenderer.invoke(IPC_CHANNELS.SKILL_GET_ALL, workspaceId),
		create: (
			workspaceId: string,
			skill: Omit<import("@xiaoa/types").Skill, "workspaceId">,
		) => ipcRenderer.invoke(IPC_CHANNELS.SKILL_CREATE, { workspaceId, skill }),
		update: (workspaceId: string, skill: import("@xiaoa/types").Skill) =>
			ipcRenderer.invoke(IPC_CHANNELS.SKILL_UPDATE, { workspaceId, skill }),
		delete: (workspaceId: string, skillName: string) =>
			ipcRenderer.invoke(IPC_CHANNELS.SKILL_DELETE, { workspaceId, skillName }),
	},

	// Memory
	memory: {
		getAll: (workspaceId: string) =>
			ipcRenderer.invoke(IPC_CHANNELS.MEMORY_GET_ALL, workspaceId),
		create: (
			workspaceId: string,
			memory: Omit<
				import("@xiaoa/types").Memory,
				"id" | "createdAt" | "updatedAt"
			>,
		) =>
			ipcRenderer.invoke(IPC_CHANNELS.MEMORY_CREATE, { workspaceId, memory }),
		update: (workspaceId: string, memory: import("@xiaoa/types").Memory) =>
			ipcRenderer.invoke(IPC_CHANNELS.MEMORY_UPDATE, { workspaceId, memory }),
		delete: (workspaceId: string, memoryId: string) =>
			ipcRenderer.invoke(IPC_CHANNELS.MEMORY_DELETE, { workspaceId, memoryId }),
	},

	// Knowledge
	knowledge: {
		getAll: (workspaceId: string) =>
			ipcRenderer.invoke(IPC_CHANNELS.KNOWLEDGE_GET_ALL, workspaceId),
		create: (
			workspaceId: string,
			knowledge: Omit<
				import("@xiaoa/types").Knowledge,
				"id" | "addedAt" | "parsedAt"
			>,
		) =>
			ipcRenderer.invoke(IPC_CHANNELS.KNOWLEDGE_CREATE, {
				workspaceId,
				knowledge,
			}),
		update: (
			workspaceId: string,
			knowledge: import("@xiaoa/types").Knowledge,
		) =>
			ipcRenderer.invoke(IPC_CHANNELS.KNOWLEDGE_UPDATE, {
				workspaceId,
				knowledge,
			}),
		delete: (workspaceId: string, knowledgeId: string) =>
			ipcRenderer.invoke(IPC_CHANNELS.KNOWLEDGE_DELETE, {
				workspaceId,
				knowledgeId,
			}),
	},

	// Projects
	project: {
		getAll: (workspaceId: string) =>
			ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_ALL, workspaceId),
		create: (
			workspaceId: string,
			project: Omit<import("@xiaoa/types").Project, "id">,
		) =>
			ipcRenderer.invoke(IPC_CHANNELS.PROJECT_CREATE, { workspaceId, project }),
		delete: (workspaceId: string, projectId: string) =>
			ipcRenderer.invoke(IPC_CHANNELS.PROJECT_DELETE, {
				workspaceId,
				projectId,
			}),
	},
} as const;

contextBridge.exposeInMainWorld("electronAPI", api);

export type { ElectronAPI } from "@xiaoa/types";
