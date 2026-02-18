export type MessageRole = "user" | "assistant";

export interface Attachment {
  name: string;
  path: string;
  mimeType?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  attachments?: Attachment[];
  timestamp: number;
}

export interface AgentSnapshot {
  name: string;
  model: string;
  systemPrompt: string;
}

export interface GlobalSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceSession {
  id: string;
  workspaceId: string;
  projectId: string | null;
  title: string;
  createdAt: number;
  updatedAt: number;
  agentSnapshot?: AgentSnapshot;
}
