import { ipc } from "@/ipc/manager";

// 类型定义
export interface Skill {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  prompt: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateSkillInput {
  workspaceId: string;
  name: string;
  prompt: string;
  description?: string;
}

export interface UpdateSkillInput {
  id: string;
  workspaceId: string;
  name?: string;
  description?: string;
  prompt?: string;
  enabled?: boolean;
}

// 获取工作区的所有技能
export async function getSkills(workspaceId: string): Promise<Skill[]> {
  return ipc.client.skill.list({ workspaceId });
}

// 获取单个技能
export async function getSkill(
  workspaceId: string,
  id: string
): Promise<Skill | null> {
  return ipc.client.skill.get({ workspaceId, id });
}

// 创建技能
export async function createSkill(input: CreateSkillInput): Promise<Skill> {
  return ipc.client.skill.create(input);
}

// 更新技能
export async function updateSkill(
  input: UpdateSkillInput
): Promise<Skill | null> {
  return ipc.client.skill.update(input);
}

// 删除技能
export async function deleteSkill(
  workspaceId: string,
  id: string
): Promise<{ success: boolean; id: string }> {
  return ipc.client.skill.delete({ workspaceId, id });
}
