import { z } from "zod";

export const chatScopeSchema = z.enum(["global", "workspace"]);

export const chatEventTypeSchema = z.enum([
  "run_start",
  "message_start",
  "message_delta",
  "message_end",
  "tool_start",
  "tool_end",
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

export type ChatScope = z.infer<typeof chatScopeSchema>;
export type ChatEventType = z.infer<typeof chatEventTypeSchema>;
export type ChatEvent = z.infer<typeof chatEventSchema>;
