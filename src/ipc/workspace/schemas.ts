import { z } from "zod";

// Agent 配置
export const agentConfigSchema = z.object({
  name: z.string(),
  avatar: z.string().optional(),
  systemPrompt: z.string(),
  model: z.string(),
  temperature: z.number().min(0).max(2).optional(),
});

// 工作区权限
export const workspacePermissionsSchema = z.object({
  mode: z.enum(["explore", "review", "auto"]),
  dangerousAutoConfirm: z.boolean().optional(),
  allowedWritePaths: z.array(z.string()).optional(),
});

// 工作区
export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  agent: agentConfigSchema,
  permissions: workspacePermissionsSchema.optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// 输入 schemas
export const createWorkspaceInputSchema = z.object({
  name: z.string().min(1).max(100),
  agent: agentConfigSchema.partial().optional(),
});

export const updateWorkspaceInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  agent: agentConfigSchema.partial().optional(),
  permissions: workspacePermissionsSchema.partial().optional(),
});

export const getWorkspaceInputSchema = z.object({
  id: z.string(),
});

export const deleteWorkspaceInputSchema = z.object({
  id: z.string(),
});
