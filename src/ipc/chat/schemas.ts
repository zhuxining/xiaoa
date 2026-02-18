import { z } from "zod";

export const chatScopeSchema = z.enum(["global", "workspace"]);
export const permissionTypeSchema = z.enum([
  "file_read",
  "file_write",
  "execute",
  "network",
]);
export const permissionRiskSchema = z.enum(["low", "medium", "high"]);

export const chatEventTypeSchema = z.enum([
  "run_start",
  "message_start",
  "message_delta",
  "message_end",
  "tool_start",
  "tool_end",
  "permission_request",
  "permission_resolved",
  "run_aborted",
  "run_error",
  "run_end",
]);

export const chatEventSchema = z.object({
  seq: z.number().int().nonnegative(),
  runId: z.string(),
  scope: chatScopeSchema,
  workspaceId: z.string().nullable(),
  sessionId: z.string(),
  type: chatEventTypeSchema,
  timestamp: z.number(),
  content: z.string().optional(),
  toolName: z.string().optional(),
  permissionId: z.string().optional(),
  permissionType: permissionTypeSchema.optional(),
  permissionRisk: permissionRiskSchema.optional(),
  permissionTitle: z.string().optional(),
  permissionDescription: z.string().optional(),
  permissionDetails: z.string().optional(),
  decision: z.enum(["allow", "deny"]).optional(),
  error: z.string().optional(),
});

export const chatSendInputSchema = z.object({
  scope: chatScopeSchema,
  workspaceId: z.string().optional(),
  sessionId: z.string(),
  content: z.string().min(1),
});

export const chatSendResultSchema = z.object({
  runId: z.string(),
});

export const chatAbortInputSchema = z.object({
  scope: chatScopeSchema,
  workspaceId: z.string().optional(),
  sessionId: z.string(),
  runId: z.string().optional(),
});

export const chatGetEventsInputSchema = z.object({
  scope: chatScopeSchema,
  workspaceId: z.string().optional(),
  sessionId: z.string(),
  afterSeq: z.number().int().nonnegative().optional(),
});

export const chatGetEventsResultSchema = z.object({
  events: z.array(chatEventSchema),
  lastSeq: z.number().int().nonnegative(),
  running: z.boolean(),
  runId: z.string().nullable(),
});

export const chatRespondPermissionInputSchema = z.object({
  scope: chatScopeSchema,
  workspaceId: z.string().optional(),
  sessionId: z.string(),
  runId: z.string(),
  requestId: z.string(),
  decision: z.enum(["allow", "deny"]),
  alwaysAllowInSession: z.boolean().optional(),
});

export const chatRespondPermissionResultSchema = z.object({
  applied: z.boolean(),
});

export type ChatScope = z.infer<typeof chatScopeSchema>;
export type ChatEventType = z.infer<typeof chatEventTypeSchema>;
export type ChatEvent = z.infer<typeof chatEventSchema>;
export type PermissionType = z.infer<typeof permissionTypeSchema>;
export type PermissionRisk = z.infer<typeof permissionRiskSchema>;
