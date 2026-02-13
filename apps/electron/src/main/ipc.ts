import { generateId } from "@xiaoa/shared/utils";
import type {
	Knowledge,
	LLMConfig,
	Memory,
	Message,
	Project,
	Session,
	Skill,
	Workspace,
} from "@xiaoa/types";
import { IPC_CHANNELS } from "@xiaoa/types";
import { ipcMain } from "electron";
import { abortChat, getAvailableModels, streamChat } from "./services/llm";
import { sessionService } from "./services/sessions";
import { storage } from "./services/storage";

export function registerIpcHandlers() {
	// === PING ===
	ipcMain.handle(IPC_CHANNELS.PING, () => "pong");

	// === LLM ===
	ipcMain.handle(IPC_CHANNELS.LLM_SET_KEY, async (_event, apiKey: string) => {
		storage.updateConfig({ llm: { ...storage.getConfig().llm, apiKey } });
	});

	ipcMain.handle(IPC_CHANNELS.LLM_TEST, async () => {
		const config = storage.getConfig().llm;
		return getAvailableModels(config.provider);
	});

	ipcMain.handle(
		IPC_CHANNELS.LLM_GET_MODELS,
		async (_event, provider: LLMConfig["provider"]) => {
			return getAvailableModels(provider);
		},
	);

	// === CHAT ===
	ipcMain.handle(
		IPC_CHANNELS.CHAT_SEND,
		async (
			_event,
			params: {
				workspaceId: string;
				message: string;
				sessionId: string;
				attachments?: Array<{ name: string; path: string }>;
				invokedSkillId?: string;
			},
		) => {
			const { workspaceId, message, sessionId, attachments } = params;

			// Get or create session
			sessionService.getOrCreateSession(workspaceId, sessionId);

			// Add user message
			sessionService.addUserMessage(
				workspaceId,
				sessionId,
				message,
				attachments,
			);

			// Build message history for LLM
			const existingMessages = sessionService.getMessages(
				workspaceId,
				sessionId,
			);
			const messages = existingMessages.map((m) => ({
				role: m.role,
				content: m.content,
			}));

			// Start streaming
			await streamChat(workspaceId, sessionId, messages, {});
		},
	);

	ipcMain.handle(IPC_CHANNELS.CHAT_ABORT, async (_event, sessionId: string) => {
		abortChat(sessionId);
	});

	// === WORKSPACE ===
	ipcMain.handle(IPC_CHANNELS.WORKSPACE_GET_ALL, async () => {
		return storage.getAllWorkspaces();
	});

	ipcMain.handle(IPC_CHANNELS.WORKSPACE_GET, async (_event, id: string) => {
		return storage.getWorkspace(id);
	});

	ipcMain.handle(
		IPC_CHANNELS.WORKSPACE_CREATE,
		async (
			_event,
			workspace: Omit<Workspace, "id" | "createdAt" | "updatedAt">,
		) => {
			const newWorkspace: Workspace = {
				...workspace,
				id: generateId("workspace"),
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};
			storage.createWorkspace(newWorkspace);
		},
	);

	ipcMain.handle(
		IPC_CHANNELS.WORKSPACE_UPDATE,
		async (_event, { id, ...updates }: Partial<Workspace> & { id: string }) => {
			storage.updateWorkspace(id, updates);
		},
	);

	ipcMain.handle(IPC_CHANNELS.WORKSPACE_DELETE, async (_event, id: string) => {
		storage.deleteWorkspace(id);
	});

	ipcMain.handle(
		IPC_CHANNELS.WORKSPACE_SET_ACTIVE,
		async (_event, id: string) => {
			storage.updateConfig({ activeWorkspaceId: id });
		},
	);

	// === SESSION ===
	ipcMain.handle(
		IPC_CHANNELS.SESSION_GET_ALL,
		async (_event, workspaceId: string) => {
			return storage.getSessions(workspaceId);
		},
	);

	ipcMain.handle(
		IPC_CHANNELS.SESSION_GET,
		async (
			_event,
			{ workspaceId, sessionId }: { workspaceId: string; sessionId: string },
		) => {
			return storage.getSession(workspaceId, sessionId);
		},
	);

	ipcMain.handle(
		IPC_CHANNELS.SESSION_CREATE,
		async (
			_event,
			{
				workspaceId,
				session,
			}: {
				workspaceId: string;
				session: Omit<Session, "id" | "createdAt" | "updatedAt">;
			},
		) => {
			const newSession: Session = {
				...session,
				id: generateId("session"),
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};
			storage.createSession(workspaceId, newSession);
		},
	);

	ipcMain.handle(
		IPC_CHANNELS.SESSION_UPDATE,
		async (
			_event,
			{ workspaceId, session }: { workspaceId: string; session: Session },
		) => {
			storage.updateSession(workspaceId, session);
		},
	);

	ipcMain.handle(
		IPC_CHANNELS.SESSION_DELETE,
		async (
			_event,
			{ workspaceId, sessionId }: { workspaceId: string; sessionId: string },
		) => {
			storage.deleteSession(workspaceId, sessionId);
		},
	);

	// === MESSAGE ===
	ipcMain.handle(
		IPC_CHANNELS.MESSAGE_GET_ALL,
		async (
			_event,
			{ workspaceId, sessionId }: { workspaceId: string; sessionId: string },
		) => {
			return storage.getMessages(workspaceId, sessionId);
		},
	);

	ipcMain.handle(
		IPC_CHANNELS.MESSAGE_CREATE,
		async (
			_event,
			{
				workspaceId,
				sessionId,
				message,
			}: {
				workspaceId: string;
				sessionId: string;
				message: Omit<Message, "id" | "timestamp">;
			},
		) => {
			const newMessage: Message = {
				...message,
				id: generateId("message"),
				timestamp: Date.now(),
			};
			storage.createMessage(workspaceId, sessionId, newMessage);
		},
	);

	// === SKILL ===
	ipcMain.handle(
		IPC_CHANNELS.SKILL_GET_ALL,
		async (_event, workspaceId: string) => {
			return storage.getSkills(workspaceId);
		},
	);

	ipcMain.handle(
		IPC_CHANNELS.SKILL_CREATE,
		async (
			_event,
			{
				workspaceId,
				skill,
			}: { workspaceId: string; skill: Omit<Skill, "workspaceId"> },
		) => {
			const newSkill: Skill = {
				...skill,
				workspaceId,
			};
			storage.createSkill(workspaceId, newSkill);
		},
	);

	ipcMain.handle(
		IPC_CHANNELS.SKILL_UPDATE,
		async (
			_event,
			{ workspaceId, skill }: { workspaceId: string; skill: Skill },
		) => {
			storage.updateSkill(workspaceId, skill);
		},
	);

	ipcMain.handle(
		IPC_CHANNELS.SKILL_DELETE,
		async (
			_event,
			{ workspaceId, skillName }: { workspaceId: string; skillName: string },
		) => {
			storage.deleteSkill(workspaceId, skillName);
		},
	);

	// === MEMORY ===
	ipcMain.handle(
		IPC_CHANNELS.MEMORY_GET_ALL,
		async (_event, workspaceId: string) => {
			return storage.getMemories(workspaceId);
		},
	);

	ipcMain.handle(
		IPC_CHANNELS.MEMORY_CREATE,
		async (
			_event,
			{
				workspaceId,
				memory,
			}: {
				workspaceId: string;
				memory: Omit<Memory, "id" | "createdAt" | "updatedAt">;
			},
		) => {
			const newMemory: Memory = {
				...memory,
				id: generateId("memory"),
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};
			storage.createMemory(workspaceId, newMemory);
		},
	);

	ipcMain.handle(
		IPC_CHANNELS.MEMORY_UPDATE,
		async (
			_event,
			{ workspaceId, memory }: { workspaceId: string; memory: Memory },
		) => {
			storage.updateMemory(workspaceId, memory);
		},
	);

	ipcMain.handle(
		IPC_CHANNELS.MEMORY_DELETE,
		async (
			_event,
			{ workspaceId, memoryId }: { workspaceId: string; memoryId: string },
		) => {
			storage.deleteMemory(workspaceId, memoryId);
		},
	);

	// === KNOWLEDGE ===
	ipcMain.handle(
		IPC_CHANNELS.KNOWLEDGE_GET_ALL,
		async (_event, workspaceId: string) => {
			return storage.getKnowledge(workspaceId);
		},
	);

	ipcMain.handle(
		IPC_CHANNELS.KNOWLEDGE_CREATE,
		async (
			_event,
			{
				workspaceId,
				knowledge,
			}: {
				workspaceId: string;
				knowledge: Omit<Knowledge, "id" | "addedAt" | "parsedAt">;
			},
		) => {
			const newKnowledge: Knowledge = {
				...knowledge,
				id: generateId("knowledge"),
				addedAt: Date.now(),
				status: "pending",
			};
			storage.createKnowledge(workspaceId, newKnowledge);
		},
	);

	ipcMain.handle(
		IPC_CHANNELS.KNOWLEDGE_UPDATE,
		async (
			_event,
			{ workspaceId, knowledge }: { workspaceId: string; knowledge: Knowledge },
		) => {
			storage.updateKnowledge(workspaceId, knowledge);
		},
	);

	ipcMain.handle(
		IPC_CHANNELS.KNOWLEDGE_DELETE,
		async (
			_event,
			{
				workspaceId,
				knowledgeId,
			}: { workspaceId: string; knowledgeId: string },
		) => {
			storage.deleteKnowledge(workspaceId, knowledgeId);
		},
	);

	// === PROJECT ===
	ipcMain.handle(
		IPC_CHANNELS.PROJECT_GET_ALL,
		async (_event, workspaceId: string) => {
			return storage.getProjects(workspaceId);
		},
	);

	ipcMain.handle(
		IPC_CHANNELS.PROJECT_CREATE,
		async (
			_event,
			{
				workspaceId,
				project,
			}: { workspaceId: string; project: Omit<Project, "id"> },
		) => {
			const newProject: Project = {
				...project,
				id: generateId("project"),
			};
			storage.createProject(workspaceId, newProject);
		},
	);

	ipcMain.handle(
		IPC_CHANNELS.PROJECT_DELETE,
		async (
			_event,
			{ workspaceId, projectId }: { workspaceId: string; projectId: string },
		) => {
			storage.deleteProject(workspaceId, projectId);
		},
	);
}
