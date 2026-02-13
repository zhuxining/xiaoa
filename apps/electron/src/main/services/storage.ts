import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { defaultGlobalConfig } from "@xiaoa/shared";
import type {
	GlobalConfig,
	Knowledge,
	Memory,
	Message,
	Project,
	Session,
	Skill,
	Workspace,
} from "@xiaoa/types";
import { app } from "electron";

const DATA_DIR = join(app.getPath("userData"), "data");
const CONFIG_FILE = join(DATA_DIR, "config.json");
const _CREDENTIALS_FILE = join(DATA_DIR, "credentials.enc");

// Ensure data directory exists
function ensureDataDir() {
	if (!existsSync(DATA_DIR)) {
		mkdirSync(DATA_DIR, { recursive: true });
	}
}

// Workspace storage
const workspaceDir = (id: string) => join(DATA_DIR, "workspaces", id);

export class StorageService {
	private workspacesCache: Map<string, Workspace> = new Map();
	private globalConfigCache: GlobalConfig | null = null;

	constructor() {
		ensureDataDir();
		this.loadGlobalConfig();
		this.loadAllWorkspaces();
	}

	// Global Config
	getConfig(): GlobalConfig {
		return this.globalConfigCache || defaultGlobalConfig();
	}

	updateConfig(updates: Partial<GlobalConfig>): void {
		const current = this.globalConfigCache || defaultGlobalConfig();
		this.globalConfigCache = { ...current, ...updates };
		this.saveGlobalConfig();
	}

	private loadGlobalConfig(): void {
		if (existsSync(CONFIG_FILE)) {
			try {
				const data = readFileSync(CONFIG_FILE, "utf-8");
				this.globalConfigCache = JSON.parse(data) as GlobalConfig;
			} catch {
				this.globalConfigCache = defaultGlobalConfig();
			}
		} else {
			this.globalConfigCache = defaultGlobalConfig();
			this.saveGlobalConfig();
		}
	}

	private saveGlobalConfig(): void {
		ensureDataDir();
		writeFileSync(CONFIG_FILE, JSON.stringify(this.globalConfigCache, null, 2));
	}

	// Workspace CRUD
	getWorkspace(id: string): Workspace | undefined {
		return this.workspacesCache.get(id);
	}

	getAllWorkspaces(): Workspace[] {
		return Array.from(this.workspacesCache.values());
	}

	createWorkspace(workspace: Workspace): void {
		const dir = workspaceDir(workspace.id);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		this.workspacesCache.set(workspace.id, workspace);
		this.saveWorkspace(workspace);
	}

	updateWorkspace(id: string, updates: Partial<Workspace>): void {
		const workspace = this.workspacesCache.get(id);
		if (workspace) {
			const updated = { ...workspace, ...updates, updatedAt: Date.now() };
			this.workspacesCache.set(id, updated);
			this.saveWorkspace(updated);
		}
	}

	deleteWorkspace(id: string): void {
		const dir = workspaceDir(id);
		if (existsSync(dir)) {
			rmSync(dir, { recursive: true, force: true });
		}
		this.workspacesCache.delete(id);
	}

	private saveWorkspace(workspace: Workspace): void {
		const dir = workspaceDir(workspace.id);
		const file = join(dir, "workspace.json");
		writeFileSync(file, JSON.stringify(workspace, null, 2));
	}

	private loadAllWorkspaces(): void {
		const workspacesRoot = join(DATA_DIR, "workspaces");
		if (!existsSync(workspacesRoot)) {
			mkdirSync(workspacesRoot, { recursive: true });
			return;
		}

		const entries = readdirSync(workspacesRoot, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isDirectory()) {
				const workspaceFile = join(
					workspacesRoot,
					entry.name,
					"workspace.json",
				);
				if (existsSync(workspaceFile)) {
					try {
						const data = readFileSync(workspaceFile, "utf-8");
						const workspace = JSON.parse(data) as Workspace;
						this.workspacesCache.set(workspace.id, workspace);
					} catch {
						// Skip invalid workspace files
					}
				}
			}
		}
	}

	// Sessions
	getSessions(workspaceId: string): Session[] {
		const dir = join(workspaceDir(workspaceId), "sessions");
		if (!existsSync(dir)) return [];

		const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
		return files.map((file) => {
			const data = readFileSync(join(dir, file), "utf-8");
			return JSON.parse(data) as Session;
		});
	}

	getSession(workspaceId: string, sessionId: string): Session | undefined {
		const file = join(
			workspaceDir(workspaceId),
			"sessions",
			`${sessionId}.json`,
		);
		if (!existsSync(file)) return undefined;

		try {
			const data = readFileSync(file, "utf-8");
			return JSON.parse(data) as Session;
		} catch {
			return undefined;
		}
	}

	createSession(workspaceId: string, session: Session): void {
		const dir = join(workspaceDir(workspaceId), "sessions");
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		const file = join(dir, `${session.id}.json`);
		writeFileSync(file, JSON.stringify(session, null, 2));
	}

	updateSession(workspaceId: string, session: Session): void {
		const file = join(
			workspaceDir(workspaceId),
			"sessions",
			`${session.id}.json`,
		);
		writeFileSync(file, JSON.stringify(session, null, 2));
	}

	deleteSession(workspaceId: string, sessionId: string): void {
		const file = join(
			workspaceDir(workspaceId),
			"sessions",
			`${sessionId}.json`,
		);
		if (existsSync(file)) {
			rmSync(file);
		}
	}

	// Messages
	getMessages(workspaceId: string, sessionId: string): Message[] {
		const dir = join(
			workspaceDir(workspaceId),
			"sessions",
			sessionId,
			"messages",
		);
		if (!existsSync(dir)) return [];

		const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
		return files
			.map((file) => {
				const data = readFileSync(join(dir, file), "utf-8");
				return JSON.parse(data) as Message;
			})
			.sort((a, b) => a.timestamp - b.timestamp);
	}

	createMessage(
		workspaceId: string,
		sessionId: string,
		message: Message,
	): void {
		const dir = join(
			workspaceDir(workspaceId),
			"sessions",
			sessionId,
			"messages",
		);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		const file = join(dir, `${message.id}.json`);
		writeFileSync(file, JSON.stringify(message, null, 2));
	}

	// Skills
	getSkills(workspaceId: string): Skill[] {
		const dir = join(workspaceDir(workspaceId), "skills");
		if (!existsSync(dir)) return [];

		const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
		return files.map((file) => {
			const data = readFileSync(join(dir, file), "utf-8");
			return JSON.parse(data) as Skill;
		});
	}

	createSkill(workspaceId: string, skill: Skill): void {
		const dir = join(workspaceDir(workspaceId), "skills");
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		const file = join(dir, `${skill.name}.json`);
		writeFileSync(file, JSON.stringify(skill, null, 2));
	}

	updateSkill(workspaceId: string, skill: Skill): void {
		const file = join(
			workspaceDir(workspaceId),
			"skills",
			`${skill.name}.json`,
		);
		writeFileSync(file, JSON.stringify(skill, null, 2));
	}

	deleteSkill(workspaceId: string, skillName: string): void {
		const file = join(workspaceDir(workspaceId), "skills", `${skillName}.json`);
		if (existsSync(file)) {
			rmSync(file);
		}
	}

	// Memories
	getMemories(workspaceId: string): Memory[] {
		const dir = join(workspaceDir(workspaceId), "memories");
		if (!existsSync(dir)) return [];

		const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
		return files.map((file) => {
			const data = readFileSync(join(dir, file), "utf-8");
			return JSON.parse(data) as Memory;
		});
	}

	createMemory(workspaceId: string, memory: Memory): void {
		const dir = join(workspaceDir(workspaceId), "memories");
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		const file = join(dir, `${memory.id}.json`);
		writeFileSync(file, JSON.stringify(memory, null, 2));
	}

	updateMemory(workspaceId: string, memory: Memory): void {
		const file = join(
			workspaceDir(workspaceId),
			"memories",
			`${memory.id}.json`,
		);
		writeFileSync(file, JSON.stringify(memory, null, 2));
	}

	deleteMemory(workspaceId: string, memoryId: string): void {
		const file = join(
			workspaceDir(workspaceId),
			"memories",
			`${memoryId}.json`,
		);
		if (existsSync(file)) {
			rmSync(file);
		}
	}

	// Knowledge
	getKnowledge(workspaceId: string): Knowledge[] {
		const dir = join(workspaceDir(workspaceId), "knowledge");
		if (!existsSync(dir)) return [];

		const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
		return files.map((file) => {
			const data = readFileSync(join(dir, file), "utf-8");
			return JSON.parse(data) as Knowledge;
		});
	}

	createKnowledge(workspaceId: string, knowledge: Knowledge): void {
		const dir = join(workspaceDir(workspaceId), "knowledge");
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		const file = join(dir, `${knowledge.id}.json`);
		writeFileSync(file, JSON.stringify(knowledge, null, 2));
	}

	updateKnowledge(workspaceId: string, knowledge: Knowledge): void {
		const file = join(
			workspaceDir(workspaceId),
			"knowledge",
			`${knowledge.id}.json`,
		);
		writeFileSync(file, JSON.stringify(knowledge, null, 2));
	}

	deleteKnowledge(workspaceId: string, knowledgeId: string): void {
		const file = join(
			workspaceDir(workspaceId),
			"knowledge",
			`${knowledgeId}.json`,
		);
		if (existsSync(file)) {
			rmSync(file);
		}
	}

	// Projects
	getProjects(workspaceId: string): Project[] {
		const dir = join(workspaceDir(workspaceId), "projects");
		if (!existsSync(dir)) return [];

		const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
		return files.map((file) => {
			const data = readFileSync(join(dir, file), "utf-8");
			return JSON.parse(data) as Project;
		});
	}

	createProject(workspaceId: string, project: Project): void {
		const dir = join(workspaceDir(workspaceId), "projects");
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		const file = join(dir, `${project.id}.json`);
		writeFileSync(file, JSON.stringify(project, null, 2));
	}

	deleteProject(workspaceId: string, projectId: string): void {
		const file = join(
			workspaceDir(workspaceId),
			"projects",
			`${projectId}.json`,
		);
		if (existsSync(file)) {
			rmSync(file);
		}
	}
}

// Singleton instance
let storageInstance: StorageService | null = null;

export function getStorage(): StorageService {
	if (!storageInstance) {
		storageInstance = new StorageService();
	}
	return storageInstance;
}

export const storage = getStorage();
