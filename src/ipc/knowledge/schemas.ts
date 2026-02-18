import { z } from "zod";

export const knowledgeSourceTypeSchema = z.enum(["local", "url"]);
export const knowledgeLegacyTypeSchema = z.enum(["file", "url"]);
export const knowledgeStatusSchema = z.enum([
  "pending",
  "parsing",
  "ready",
  "error",
]);

export const knowledgeSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  sourceType: knowledgeSourceTypeSchema,
  // Compatibility for legacy renderer fields.
  type: knowledgeLegacyTypeSchema.optional(),
  source: z.string().optional(),
  originalPath: z.string().optional(),
  originalUrl: z.string().optional(),
  mimeType: z.string().optional(),
  parsedFile: z.string().optional(),
  description: z.string().optional(),
  status: knowledgeStatusSchema,
  error: z.string().optional(),
  addedAt: z.number(),
  parsedAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export const listKnowledgeInputSchema = z.object({
  workspaceId: z.string(),
});

export const addKnowledgeInputSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1).max(500),
  sourceType: knowledgeSourceTypeSchema,
  originalPath: z.string().optional(),
  originalUrl: z.string().url().optional(),
  mimeType: z.string().optional(),
});

export const reparseKnowledgeInputSchema = z.object({
  workspaceId: z.string(),
  id: z.string(),
});

export const getKnowledgeContentInputSchema = z.object({
  workspaceId: z.string(),
  id: z.string(),
});

export const deleteKnowledgeInputSchema = z.object({
  workspaceId: z.string(),
  id: z.string(),
});

export type Knowledge = z.infer<typeof knowledgeSchema>;
