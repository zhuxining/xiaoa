import { ipc } from "@/ipc/manager";

export interface Knowledge {
  id: string;
  workspaceId: string;
  name: string;
  type: "file" | "url";
  source: string;
  status: "pending" | "ready" | "error";
  error?: string;
  addedAt: number;
}

export interface AddKnowledgeInput {
  workspaceId: string;
  name: string;
  type: "file" | "url";
  source: string;
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
