import { z } from "zod";

export const knowledgeTypeSchema = z.enum(["file", "url"]);
export const knowledgeStatusSchema = z.enum(["pending", "ready", "error"]);

export const knowledgeSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  type: knowledgeTypeSchema,
  source: z.string(),
  status: knowledgeStatusSchema,
  error: z.string().optional(),
  addedAt: z.number(),
});

export const listKnowledgeInputSchema = z.object({
  workspaceId: z.string(),
});

export const addKnowledgeInputSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1).max(500),
  type: knowledgeTypeSchema,
  source: z.string().min(1),
});

export const deleteKnowledgeInputSchema = z.object({
  workspaceId: z.string(),
  id: z.string(),
});

export type Knowledge = z.infer<typeof knowledgeSchema>;
