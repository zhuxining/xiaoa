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
  "tool_update",
  "tool_call",
  "tool_result",
  "compaction",
  "compaction_start",
  "compaction_end",
  "retry_start",
  "retry_end",
  "turn_start",
  "turn_end",
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
  // message events
  content: z.string().optional(),
  // tool events
  toolName: z.string().optional(),
  toolCallId: z.string().optional(),
  args: z.string().optional(),
  isError: z.boolean().optional(),
  // compaction events
  messagesBefore: z.number().optional(),
  messagesAfter: z.number().optional(),
  // permission events
  permissionId: z.string().optional(),
  permissionType: permissionTypeSchema.optional(),
  permissionRisk: permissionRiskSchema.optional(),
  permissionTitle: z.string().optional(),
  permissionDescription: z.string().optional(),
  permissionDetails: z.string().optional(),
  decision: z.enum(["allow", "deny"]).optional(),
  // error events
  error: z.string().optional(),
});

export const chatSendInputSchema = z.object({
  scope: chatScopeSchema,
  workspaceId: z.string().optional(),
  sessionId: z.string(),
  content: z.string().min(1),
  workspaceRootPath: z.string().optional(),
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

// Steering: 中途打断 Agent 执行
export const chatSteerInputSchema = z.object({
  scope: chatScopeSchema,
  workspaceId: z.string().optional(),
  sessionId: z.string(),
  message: z.string().min(1),
});

export const chatSteerResultSchema = z.object({
  queued: z.boolean(),
});

// Follow-up: Agent 完成后追加新任务
export const chatFollowUpInputSchema = z.object({
  scope: chatScopeSchema,
  workspaceId: z.string().optional(),
  sessionId: z.string(),
  message: z.string().min(1),
});

export const chatFollowUpResultSchema = z.object({
  queued: z.boolean(),
});

// Session stats
export const chatGetStatsInputSchema = z.object({
  scope: chatScopeSchema,
  workspaceId: z.string().optional(),
  sessionId: z.string(),
});

export const chatGetStatsResultSchema = z
  .object({
    sessionFile: z.string().optional(),
    sessionId: z.string(),
    userMessages: z.number(),
    assistantMessages: z.number(),
    toolCalls: z.number(),
    toolResults: z.number(),
    totalMessages: z.number(),
    tokens: z.object({
      input: z.number(),
      output: z.number(),
      cacheRead: z.number(),
      cacheWrite: z.number(),
      total: z.number(),
    }),
    cost: z.number(),
  })
  .nullable();

// Context usage
export const chatGetContextUsageInputSchema = z.object({
  scope: chatScopeSchema,
  workspaceId: z.string().optional(),
  sessionId: z.string(),
});

export const chatGetContextUsageResultSchema = z
  .object({
    tokens: z.number().nullable(),
    contextWindow: z.number(),
    percent: z.number().nullable(),
  })
  .nullable();

// Set active tools
export const chatSetActiveToolsInputSchema = z.object({
  scope: chatScopeSchema,
  workspaceId: z.string().optional(),
  sessionId: z.string(),
  toolNames: z.array(z.string()),
});

export const chatSetActiveToolsResultSchema = z.object({
  applied: z.boolean(),
});

export type ChatScope = z.infer<typeof chatScopeSchema>;
export type ChatEventType = z.infer<typeof chatEventTypeSchema>;
export type ChatEvent = z.infer<typeof chatEventSchema>;
export type PermissionType = z.infer<typeof permissionTypeSchema>;
export type PermissionRisk = z.infer<typeof permissionRiskSchema>;
