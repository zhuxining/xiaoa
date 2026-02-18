import { ipc } from "@/ipc/manager";

export type SissonScope = "global" | "workspace";
export type MessageRole = "user" | "assistant";

export interface Attachment {
  mimeType?: string;
  name: string;
  path: string;
}

export interface AgentSnapshot {
  model: string;
  name: string;
  systemPrompt: string;
}

export interface Sisson {
  agentSnapshot?: AgentSnapshot;
  createdAt: number;
  id: string;
  messageCount: number;
  projectId: string | null;
  scope: SissonScope;
  title: string;
  updatedAt: number;
  workspaceId: string | null;
}

export interface Message {
  attachments?: Attachment[];
  content: string;
  id: string;
  role: MessageRole;
  timestamp: number;
}

export interface ListSissonInput {
  projectId?: string | null;
  scope: SissonScope;
  workspaceId?: string;
}

export interface CreateSissonInput {
  projectId?: string | null;
  scope: SissonScope;
  title?: string;
  workspaceId?: string;
}

export interface UpdateSissonInput {
  id: string;
  scope: SissonScope;
  title: string;
  workspaceId?: string;
}

export interface AddMessageInput {
  attachments?: Attachment[];
  content: string;
  role: MessageRole;
  scope: SissonScope;
  sessionId: string;
  workspaceId?: string;
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
