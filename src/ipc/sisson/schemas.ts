import { z } from "zod";

export const sissonScopeSchema = z.enum(["global", "workspace"]);

export const messageRoleSchema = z.enum(["user", "assistant"]);

export const attachmentSchema = z.object({
  name: z.string(),
  path: z.string(),
  mimeType: z.string().optional(),
});

export const agentSnapshotSchema = z.object({
  name: z.string(),
  model: z.string(),
  systemPrompt: z.string(),
});

export const sissonSchema = z.object({
  id: z.string(),
  scope: sissonScopeSchema,
  workspaceId: z.string().nullable(),
  projectId: z.string().nullable(),
  title: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  agentSnapshot: agentSnapshotSchema.optional(),
});

export const messageSchema = z.object({
  id: z.string(),
  role: messageRoleSchema,
  content: z.string(),
  attachments: z.array(attachmentSchema).optional(),
  timestamp: z.number(),
});

export const listSissonsInputSchema = z.object({
  scope: sissonScopeSchema,
  workspaceId: z.string().optional(),
  projectId: z.string().nullable().optional(),
});

export const getSissonInputSchema = z.object({
  scope: sissonScopeSchema,
  workspaceId: z.string().optional(),
  id: z.string(),
});

export const createSissonInputSchema = z.object({
  scope: sissonScopeSchema,
  workspaceId: z.string().optional(),
  title: z.string().min(1).max(200).optional(),
  projectId: z.string().nullable().optional(),
});

export const updateSissonInputSchema = z.object({
  scope: sissonScopeSchema,
  workspaceId: z.string().optional(),
  id: z.string(),
  title: z.string().min(1).max(200),
});

export const deleteSissonInputSchema = z.object({
  scope: sissonScopeSchema,
  workspaceId: z.string().optional(),
  id: z.string(),
});

export const getMessagesInputSchema = z.object({
  scope: sissonScopeSchema,
  workspaceId: z.string().optional(),
  sessionId: z.string(),
});

export const addMessageInputSchema = z.object({
  scope: sissonScopeSchema,
  workspaceId: z.string().optional(),
  sessionId: z.string(),
  role: messageRoleSchema,
  content: z.string(),
  attachments: z.array(attachmentSchema).optional(),
});
