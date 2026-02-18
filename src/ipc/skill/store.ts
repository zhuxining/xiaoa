import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import type { z } from "zod";
import type { skillSchema } from "./schemas";

type Skill = z.infer<typeof skillSchema>;

// 获取工作区根目录
function getWorkspacesRoot(): string {
  const userDataPath = app.getPath("userData");
  return join(userDataPath, "workspaces");
}

// 获取工作区技能目录
function getSkillsDir(workspaceId: string): string {
  return join(getWorkspacesRoot(), workspaceId, "skills");
}

// 获取技能文件路径
function getSkillPath(workspaceId: string, skillId: string): string {
  return join(getSkillsDir(workspaceId), `${skillId}.json`);
}

// 确保技能目录存在
function ensureSkillsDir(workspaceId: string): void {
  const dir = getSkillsDir(workspaceId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// 生成唯一 ID
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// 列出工作区的所有技能
export function listSkills(workspaceId: string): Skill[] {
  const dir = getSkillsDir(workspaceId);
  if (!existsSync(dir)) {
    return [];
  }

  const skills: Skill[] = [];
  const files = readdirSync(dir);

  for (const file of files) {
    if (!file.endsWith(".json")) {
      continue;
    }
    const skillPath = join(dir, file);
    try {
      const content = readFileSync(skillPath, "utf-8");
      skills.push(JSON.parse(content) as Skill);
    } catch {
      // 忽略损坏的文件
    }
  }

  return skills.sort((a, b) => a.createdAt - b.createdAt);
}

// 获取单个技能
export function getSkill(workspaceId: string, id: string): Skill | null {
  const skillPath = getSkillPath(workspaceId, id);
  if (!existsSync(skillPath)) {
    return null;
  }

  try {
    const content = readFileSync(skillPath, "utf-8");
    return JSON.parse(content) as Skill;
  } catch {
    return null;
  }
}

// 创建技能
export function createSkill(
  workspaceId: string,
  name: string,
  prompt: string,
  description?: string
): Skill {
  ensureSkillsDir(workspaceId);

  const id = generateId();
  const now = Date.now();
  const skill: Skill = {
    id,
    workspaceId,
    name,
    description: description ?? "",
    prompt,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };

  const skillPath = getSkillPath(workspaceId, id);
  writeFileSync(skillPath, JSON.stringify(skill, null, 2), "utf-8");

  return skill;
}

// 更新技能
export function updateSkill(
  workspaceId: string,
  id: string,
  updates: {
    name?: string;
    description?: string;
    prompt?: string;
    enabled?: boolean;
  }
): Skill | null {
  const skill = getSkill(workspaceId, id);
  if (!skill) {
    return null;
  }

  const updated: Skill = {
    ...skill,
    name: updates.name ?? skill.name,
    description: updates.description ?? skill.description,
    prompt: updates.prompt ?? skill.prompt,
    enabled: updates.enabled ?? skill.enabled,
    updatedAt: Date.now(),
  };

  const skillPath = getSkillPath(workspaceId, id);
  writeFileSync(skillPath, JSON.stringify(updated, null, 2), "utf-8");

  return updated;
}

// 删除技能
export function deleteSkill(workspaceId: string, id: string): boolean {
  const skillPath = getSkillPath(workspaceId, id);
  if (!existsSync(skillPath)) {
    return false;
  }

  try {
    unlinkSync(skillPath);
    return true;
  } catch {
    return false;
  }
}
