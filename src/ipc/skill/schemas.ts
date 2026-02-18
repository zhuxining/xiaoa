import { basename } from "node:path";
import { z } from "zod";

export const skillReferenceSchema = z.object({
  name: z.string(),
  path: z.string(),
});

// 技能
export const skillSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string().optional(),
  argumentHint: z.string().optional(),
  prompt: z.string(),
  references: z.array(skillReferenceSchema).optional(),
  enabled: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// 创建技能输入
export const createSkillInputSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(10).optional(),
  argumentHint: z.string().max(200).optional(),
  prompt: z.string(),
});

// 更新技能输入
export const updateSkillInputSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(10).optional(),
  argumentHint: z.string().max(200).optional(),
  prompt: z.string().optional(),
  enabled: z.boolean().optional(),
});

// 获取技能输入
export const getSkillInputSchema = z.object({
  workspaceId: z.string(),
  id: z.string(),
});

// 列出技能输入
export const listSkillsInputSchema = z.object({
  workspaceId: z.string(),
});

// 删除技能输入
export const deleteSkillInputSchema = z.object({
  workspaceId: z.string(),
  id: z.string(),
});

export const importSkillInputSchema = z.object({
  workspaceId: z.string(),
  dirPath: z.string(),
});

export const exportSkillInputSchema = z.object({
  workspaceId: z.string(),
  id: z.string(),
  targetDir: z.string(),
});

export const addSkillReferencesInputSchema = z.object({
  workspaceId: z.string(),
  id: z.string(),
  filePaths: z.array(z.string().min(1)),
});

const FILE_EXTENSION_REGEX = /\.[^.]+$/;

export const pickSkillNameFromPath = (path: string): string =>
  basename(path).replace(FILE_EXTENSION_REGEX, "");

// 类型导出
export type Skill = z.infer<typeof skillSchema>;
