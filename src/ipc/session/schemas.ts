/**
 * session/schemas.ts - Session IPC Schemas
 *
 * 基于 pi SessionManager JSONL 格式的会话管理。
 */

import { z } from "zod";

export const sessionScopeSchema = z.enum(["global", "workspace"]);

/**
 * 会话元数据
 */
export const sessionMetaSchema = z.object({
  /** 会话 ID（文件名，不含扩展名） */
  id: z.string(),
  /** 作用域 */
  scope: sessionScopeSchema,
  /** 工作区 ID */
  workspaceId: z.string().nullable(),
  /** 会话标题（从首条消息截取） */
  title: z.string(),
  /** 创建时间（文件 mtime） */
  createdAt: z.number(),
  /** 更新时间 */
  updatedAt: z.number(),
  /** 消息数量 */
  messageCount: z.number(),
});

/**
 * 会话消息
 */
export const sessionMessageSchema = z.object({
  /** 角色 */
  role: z.enum(["user", "assistant", "toolResult"]),
  /** 内容 */
  content: z.union([z.string(), z.array(z.any())]),
  /** 时间戳 */
  timestamp: z.number(),
});

export const listSessionsInputSchema = z.object({
  scope: sessionScopeSchema,
  workspaceId: z.string().optional(),
});

export const getSessionInputSchema = z.object({
  scope: sessionScopeSchema,
  workspaceId: z.string().optional(),
  id: z.string(),
});

export const getSessionMessagesInputSchema = z.object({
  scope: sessionScopeSchema,
  workspaceId: z.string().optional(),
  sessionId: z.string(),
});

export const createSessionInputSchema = z.object({
  scope: sessionScopeSchema,
  workspaceId: z.string().optional(),
  title: z.string().min(1).max(200).optional(),
});

export const deleteSessionInputSchema = z.object({
  scope: sessionScopeSchema,
  workspaceId: z.string().optional(),
  id: z.string(),
});

// 导出类型
export type SessionMeta = z.infer<typeof sessionMetaSchema>;
export type SessionMessage = z.infer<typeof sessionMessageSchema>;
export type ListSessionsInput = z.infer<typeof listSessionsInputSchema>;
export type GetSessionInput = z.infer<typeof getSessionInputSchema>;
export type GetSessionMessagesInput = z.infer<
  typeof getSessionMessagesInputSchema
>;
export type CreateSessionInput = z.infer<typeof createSessionInputSchema>;
export type DeleteSessionInput = z.infer<typeof deleteSessionInputSchema>;
