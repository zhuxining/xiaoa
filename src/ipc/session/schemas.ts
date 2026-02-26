/**
 * session/schemas.ts - Session IPC Schemas
 *
 * 基于 pi SessionManager 的会话管理。
 * - workspaceId 为 null 时表示全局（小A）会话
 * - projectPath 用于过滤：pi 会话头中存储了 cwd（项目路径）
 */

import { z } from "zod";

export const sessionMetaSchema = z.object({
  id: z.string(),
  workspaceId: z.string().nullable(),
  title: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  messageCount: z.number(),
});

export const listSessionsInputSchema = z.object({
  workspaceId: z.string().nullable(),
  /** 按项目路径过滤（对应 pi SessionInfo.cwd） */
  projectPath: z.string().optional(),
});

export const getSessionInputSchema = z.object({
  workspaceId: z.string().nullable(),
  id: z.string(),
});

export const getSessionMessagesInputSchema = z.object({
  workspaceId: z.string().nullable(),
  sessionId: z.string(),
});

export const createSessionInputSchema = z.object({
  workspaceId: z.string().nullable(),
  /** 项目路径，写入 pi 会话头的 cwd 字段，供 list 过滤使用 */
  cwd: z.string().optional(),
  title: z.string().min(1).max(200).optional(),
});

export const deleteSessionInputSchema = z.object({
  workspaceId: z.string().nullable(),
  id: z.string(),
});

export const renameSessionInputSchema = z.object({
  workspaceId: z.string().nullable(),
  id: z.string(),
  name: z.string().min(1).max(200),
});

export type SessionMeta = z.infer<typeof sessionMetaSchema>;
export type ListSessionsInput = z.infer<typeof listSessionsInputSchema>;
export type GetSessionInput = z.infer<typeof getSessionInputSchema>;
export type GetSessionMessagesInput = z.infer<
  typeof getSessionMessagesInputSchema
>;
export type CreateSessionInput = z.infer<typeof createSessionInputSchema>;
export type DeleteSessionInput = z.infer<typeof deleteSessionInputSchema>;
