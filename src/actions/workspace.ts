import { ipc } from "@/ipc/manager";

// 类型定义
export interface AgentConfig {
  avatar?: string;
  model: string;
  name: string;
  systemPrompt: string;
  temperature?: number;
}

export interface WorkspacePermissions {
  allowedWritePaths?: string[];
  dangerousAutoConfirm?: boolean;
  mode: "explore" | "review" | "auto";
}

export interface Workspace {
  agent: AgentConfig;
  createdAt: number;
  id: string;
  name: string;
  permissions?: WorkspacePermissions;
  updatedAt: number;
}

export interface CreateWorkspaceInput {
  agent?: Partial<AgentConfig>;
  name: string;
}

export interface UpdateWorkspaceInput {
  agent?: Partial<AgentConfig>;
  id: string;
  name?: string;
  permissions?: Partial<WorkspacePermissions>;
}

// 获取所有工作区
export async function getWorkspaces(): Promise<Workspace[]> {
  return await ipc.client.workspace.list();
}

// 获取单个工作区
export async function getWorkspace(id: string): Promise<Workspace | null> {
  return await ipc.client.workspace.get({ id });
}

// 创建工作区
export async function createWorkspace(
  input: CreateWorkspaceInput
): Promise<Workspace> {
  return await ipc.client.workspace.create(input);
}

// 更新工作区
export async function updateWorkspace(
  input: UpdateWorkspaceInput
): Promise<Workspace | null> {
  return await ipc.client.workspace.update(input);
}

// 删除工作区
export async function deleteWorkspace(
  id: string
): Promise<{ success: boolean; id: string }> {
  return await ipc.client.workspace.delete({ id });
}
