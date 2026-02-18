export type MessageRole = "user" | "assistant";

export interface Attachment {
  mimeType?: string;
  name: string;
  path: string;
}

export interface Message {
  attachments?: Attachment[];
  content: string;
  id: string;
  role: MessageRole;
  timestamp: number;
}

export interface AgentSnapshot {
  model: string;
  name: string;
  systemPrompt: string;
}

export interface GlobalSession {
  createdAt: number;
  id: string;
  title: string;
  updatedAt: number;
}

export interface WorkspaceSession {
  agentSnapshot?: AgentSnapshot;
  createdAt: number;
  id: string;
  projectId: string | null;
  title: string;
  updatedAt: number;
  workspaceId: string;
}
