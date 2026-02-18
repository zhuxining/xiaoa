import { ipc } from "@/ipc/manager";

// 类型定义
export interface AgentConfig {
  name: string;
  avatar?: string;
  systemPrompt: string;
  model: string;
  temperature?: number;
}

export interface WorkspacePermissions {
  mode: "explore" | "review" | "auto";
  dangerousAutoConfirm?: boolean;
  allowedWritePaths?: string[];
}

export interface Workspace {
  id: string;
  name: string;
  agent: AgentConfig;
  permissions?: WorkspacePermissions;
  createdAt: number;
  updatedAt: number;
}

export interface CreateWorkspaceInput {
  name: string;
  agent?: Partial<AgentConfig>;
}

export interface UpdateWorkspaceInput {
  id: string;
  name?: string;
  agent?: Partial<AgentConfig>;
  permissions?: Partial<WorkspacePermissions>;
}

// 获取所有工作区
export async function getWorkspaces(): Promise<Workspace[]> {
  return ipc.client.workspace.list();
}

// 获取单个工作区
export async function getWorkspace(id: string): Promise<Workspace | null> {
  return ipc.client.workspace.get({ id });
}

// 创建工作区
export async function createWorkspace(
  input: CreateWorkspaceInput
): Promise<Workspace> {
  return ipc.client.workspace.create(input);
}

// 更新工作区
export async function updateWorkspace(
  input: UpdateWorkspaceInput
): Promise<Workspace | null> {
  return ipc.client.workspace.update(input);
}

// 删除工作区
export async function deleteWorkspace(
  id: string
): Promise<{ success: boolean; id: string }> {
  return ipc.client.workspace.delete({ id });
}
