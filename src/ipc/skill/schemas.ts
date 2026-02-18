import { z } from "zod";

// 技能
export const skillSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  description: z.string(),
  prompt: z.string(),
  enabled: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// 创建技能输入
export const createSkillInputSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  prompt: z.string(),
});

// 更新技能输入
export const updateSkillInputSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
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

// 类型导出
export type Skill = z.infer<typeof skillSchema>;
