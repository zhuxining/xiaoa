import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import type { AgentConfig } from "@/ipc/workspace/schemas";
import { getWorkspace } from "@/ipc/workspace/store";
import type {
  AgentSnapshot,
  Message,
  WorkspaceSession as Session,
} from "./store-types";

function getWorkspacesRoot(): string {
  return join(app.getPath("userData"), "workspaces");
}

function getWorkspaceRoot(workspaceId: string): string {
  return join(getWorkspacesRoot(), workspaceId);
}

function getSessionsDir(workspaceId: string): string {
  return join(getWorkspaceRoot(workspaceId), "sessions");
}

function getSessionsIndexPath(workspaceId: string): string {
  return join(getSessionsDir(workspaceId), "index.json");
}

function getSessionMessagesPath(
  workspaceId: string,
  sessionId: string
): string {
  return join(getSessionsDir(workspaceId), `${sessionId}.jsonl`);
}

function ensureSessionsDir(workspaceId: string): void {
  const dir = getSessionsDir(workspaceId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function toAgentSnapshot(
  agent: AgentConfig | undefined
): AgentSnapshot | undefined {
  if (!agent) {
    return undefined;
  }
  return {
    name: agent.name,
    model: agent.model,
    systemPrompt: agent.systemPrompt,
  };
}

function readSessionsIndex(workspaceId: string): Session[] {
  const indexPath = getSessionsIndexPath(workspaceId);
  if (!existsSync(indexPath)) {
    return [];
  }

  try {
    const content = readFileSync(indexPath, "utf-8");
    const raw = JSON.parse(content) as (Session & {
      workspaceId?: string;
      projectId?: string | null;
      agentSnapshot?: AgentSnapshot;
    })[];

    return raw.map((session) => ({
      ...session,
      workspaceId,
      projectId: session.projectId ?? null,
      agentSnapshot: session.agentSnapshot,
    }));
  } catch {
    return [];
  }
}

function writeSessionsIndex(workspaceId: string, sessions: Session[]): void {
  ensureSessionsDir(workspaceId);
  writeFileSync(
    getSessionsIndexPath(workspaceId),
    JSON.stringify(sessions, null, 2),
    "utf-8"
  );
}

export function listSessions(
  workspaceId: string,
  projectId?: string | null
): Session[] {
  const sessions = readSessionsIndex(workspaceId).sort(
    (a, b) => b.updatedAt - a.updatedAt
  );

  if (projectId === undefined) {
    return sessions;
  }

  return sessions.filter((session) => session.projectId === projectId);
}

export function getSession(workspaceId: string, id: string): Session | null {
  const sessions = readSessionsIndex(workspaceId);
  return sessions.find((session) => session.id === id) ?? null;
}

export function createSession(
  workspaceId: string,
  title?: string,
  projectId?: string | null
): Session {
  ensureSessionsDir(workspaceId);

  const id = generateId();
  const now = Date.now();
  const workspace = getWorkspace(workspaceId);
  const session: Session = {
    id,
    workspaceId,
    projectId: projectId ?? null,
    title: title ?? "新会话",
    createdAt: now,
    updatedAt: now,
    agentSnapshot: toAgentSnapshot(workspace?.agent),
  };

  const sessions = readSessionsIndex(workspaceId);
  sessions.push(session);
  writeSessionsIndex(workspaceId, sessions);

  writeFileSync(getSessionMessagesPath(workspaceId, id), "", "utf-8");

  return session;
}

export function updateSession(
  workspaceId: string,
  id: string,
  title: string
): Session | null {
  const sessions = readSessionsIndex(workspaceId);
  const index = sessions.findIndex((session) => session.id === id);

  if (index === -1) {
    return null;
  }

  sessions[index] = {
    ...sessions[index],
    title,
    updatedAt: Date.now(),
  };

  writeSessionsIndex(workspaceId, sessions);
  return sessions[index];
}

export function touchSession(workspaceId: string, id: string): void {
  const sessions = readSessionsIndex(workspaceId);
  const index = sessions.findIndex((session) => session.id === id);

  if (index === -1) {
    return;
  }

  sessions[index].updatedAt = Date.now();
  writeSessionsIndex(workspaceId, sessions);
}

export function deleteSession(workspaceId: string, id: string): boolean {
  const sessions = readSessionsIndex(workspaceId);
  const index = sessions.findIndex((session) => session.id === id);

  if (index === -1) {
    return false;
  }

  sessions.splice(index, 1);
  writeSessionsIndex(workspaceId, sessions);

  const messagesPath = getSessionMessagesPath(workspaceId, id);
  if (existsSync(messagesPath)) {
    unlinkSync(messagesPath);
  }

  return true;
}

export function addMessage(
  workspaceId: string,
  sessionId: string,
  role: Message["role"],
  content: string,
  attachments?: Message["attachments"]
): Message | null {
  if (!getSession(workspaceId, sessionId)) {
    return null;
  }

  const message: Message = {
    id: generateId(),
    role,
    content,
    attachments,
    timestamp: Date.now(),
  };

  appendFileSync(
    getSessionMessagesPath(workspaceId, sessionId),
    `${JSON.stringify(message)}\n`,
    "utf-8"
  );

  touchSession(workspaceId, sessionId);
  return message;
}

export function getMessages(workspaceId: string, sessionId: string): Message[] {
  const messagesPath = getSessionMessagesPath(workspaceId, sessionId);
  if (!existsSync(messagesPath)) {
    return [];
  }

  const messages: Message[] = [];
  const content = readFileSync(messagesPath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());

  for (const line of lines) {
    try {
      messages.push(JSON.parse(line) as Message);
    } catch {
      // Ignore malformed lines.
    }
  }

  return messages;
}

export function getSessionStats(
  workspaceId: string,
  sessionId: string
): { messageCount: number } | null {
  if (!getSession(workspaceId, sessionId)) {
    return null;
  }

  return { messageCount: getMessages(workspaceId, sessionId).length };
}
