import { ipc } from "@/ipc/manager";

export interface Knowledge {
  addedAt: number;
  description?: string;
  error?: string;
  id: string;
  mimeType?: string;
  name: string;
  originalPath?: string;
  originalUrl?: string;
  parsedAt?: number;
  parsedFile?: string;
  source?: string;
  sourceType: "local" | "url";
  status: "pending" | "parsing" | "ready" | "error";
  type?: "file" | "url";
  updatedAt?: number;
  workspaceId: string;
}

export interface AddKnowledgeInput {
  mimeType?: string;
  name: string;
  originalPath?: string;
  originalUrl?: string;
  sourceType: "local" | "url";
  workspaceId: string;
}

export async function getKnowledge(workspaceId: string): Promise<Knowledge[]> {
  return await ipc.client.knowledge.list({ workspaceId });
}

export async function addKnowledge(
  input: AddKnowledgeInput
): Promise<Knowledge> {
  return await ipc.client.knowledge.add(input);
}

export async function deleteKnowledge(
  workspaceId: string,
  id: string
): Promise<{ success: boolean; id: string }> {
  return await ipc.client.knowledge.delete({ workspaceId, id });
}

export async function reparseKnowledge(
  workspaceId: string,
  id: string
): Promise<Knowledge | null> {
  return await ipc.client.knowledge.reparse({ workspaceId, id });
}

export async function getKnowledgeContent(
  workspaceId: string,
  id: string
): Promise<{ id: string; content: string; parsedFile: string } | null> {
  return await ipc.client.knowledge.getContent({ workspaceId, id });
}

export async function selectKnowledgeFiles(): Promise<string[]> {
  return await ipc.client.knowledge.selectFiles();
}
