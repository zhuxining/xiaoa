import { ipc } from "@/ipc/manager";

// 类型定义
export interface Skill {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  icon?: string;
  argumentHint?: string;
  prompt: string;
  references?: Array<{ name: string; path: string }>;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateSkillInput {
  workspaceId: string;
  name: string;
  prompt: string;
  description?: string;
  icon?: string;
  argumentHint?: string;
}

export interface UpdateSkillInput {
  id: string;
  workspaceId: string;
  name?: string;
  description?: string;
  icon?: string;
  argumentHint?: string;
  prompt?: string;
  enabled?: boolean;
}

// 获取工作区的所有技能
export async function getSkills(workspaceId: string): Promise<Skill[]> {
  return await ipc.client.skill.list({ workspaceId });
}

// 获取单个技能
export async function getSkill(
  workspaceId: string,
  id: string
): Promise<Skill | null> {
  return await ipc.client.skill.get({ workspaceId, id });
}

// 创建技能
export async function createSkill(input: CreateSkillInput): Promise<Skill> {
  return await ipc.client.skill.create(input);
}

// 更新技能
export async function updateSkill(
  input: UpdateSkillInput
): Promise<Skill | null> {
  return await ipc.client.skill.update(input);
}

// 删除技能
export async function deleteSkill(
  workspaceId: string,
  id: string
): Promise<{ success: boolean; id: string }> {
  return await ipc.client.skill.delete({ workspaceId, id });
}

export async function selectSkillImportDir(): Promise<string | null> {
  return await ipc.client.skill.selectImportDir();
}

export async function selectSkillExportDir(): Promise<string | null> {
  return await ipc.client.skill.selectExportDir();
}

export async function importSkillFromDir(
  workspaceId: string,
  dirPath: string
): Promise<Skill> {
  return await ipc.client.skill.importFromDir({ workspaceId, dirPath });
}

export async function exportSkillToDir(
  workspaceId: string,
  id: string,
  targetDir: string
): Promise<{ path: string } | null> {
  return await ipc.client.skill.exportToDir({ workspaceId, id, targetDir });
}

export async function selectSkillReferenceFiles(): Promise<string[]> {
  return await ipc.client.skill.selectReferenceFiles();
}

export async function addSkillReferences(
  workspaceId: string,
  id: string,
  filePaths: string[]
): Promise<Skill | null> {
  return await ipc.client.skill.addReferences({ workspaceId, id, filePaths });
}
