import { ipc } from "@/ipc/manager";

export type SissonScope = "global" | "workspace";
export type MessageRole = "user" | "assistant";

export interface Attachment {
  name: string;
  path: string;
  mimeType?: string;
}

export interface AgentSnapshot {
  name: string;
  model: string;
  systemPrompt: string;
}

export interface Sisson {
  id: string;
  scope: SissonScope;
  workspaceId: string | null;
  projectId: string | null;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  agentSnapshot?: AgentSnapshot;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  attachments?: Attachment[];
  timestamp: number;
}

export interface ListSissonInput {
  scope: SissonScope;
  workspaceId?: string;
  projectId?: string | null;
}

export interface CreateSissonInput {
  scope: SissonScope;
  workspaceId?: string;
  title?: string;
  projectId?: string | null;
}

export interface UpdateSissonInput {
  scope: SissonScope;
  workspaceId?: string;
  id: string;
  title: string;
}

export interface AddMessageInput {
  scope: SissonScope;
  workspaceId?: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  attachments?: Attachment[];
}

export async function listSissons(input: ListSissonInput): Promise<Sisson[]> {
  return await ipc.client.sisson.list(input);
}

export async function getSisson(
  input: Pick<UpdateSissonInput, "scope" | "workspaceId" | "id">
): Promise<Sisson | null> {
  return await ipc.client.sisson.get(input);
}

export async function createSisson(input: CreateSissonInput): Promise<Sisson> {
  return await ipc.client.sisson.create(input);
}

export async function updateSisson(
  input: UpdateSissonInput
): Promise<Sisson | null> {
  return await ipc.client.sisson.update(input);
}

export async function deleteSisson(
  input: Pick<UpdateSissonInput, "scope" | "workspaceId" | "id">
): Promise<{ success: boolean; id: string }> {
  return await ipc.client.sisson.delete(input);
}

export async function getSissonMessages(
  input: Pick<AddMessageInput, "scope" | "workspaceId" | "sessionId">
): Promise<Message[]> {
  return await ipc.client.sisson.getMessages(input);
}

export async function addSissonMessage(
  input: AddMessageInput
): Promise<Message | null> {
  return await ipc.client.sisson.addMessage(input);
}
