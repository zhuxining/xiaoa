import { z } from "zod";

// 消息角色
export const messageRoleSchema = z.enum(["user", "assistant"]);

// 消息附件
export const attachmentSchema = z.object({
  name: z.string(),
  path: z.string(),
  mimeType: z.string().optional(),
});

// 消息
export const messageSchema = z.object({
  id: z.string(),
  role: messageRoleSchema,
  content: z.string(),
  attachments: z.array(attachmentSchema).optional(),
  timestamp: z.number(),
});

// 会话
export const sessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// 创建会话输入
export const createSessionInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

// 获取会话输入
export const getSessionInputSchema = z.object({
  id: z.string(),
});

// 更新会话输入
export const updateSessionInputSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
});

// 删除会话输入
export const deleteSessionInputSchema = z.object({
  id: z.string(),
});

// 添加消息输入
export const addMessageInputSchema = z.object({
  sessionId: z.string(),
  role: messageRoleSchema,
  content: z.string(),
  attachments: z.array(attachmentSchema).optional(),
});

// 获取会话消息输入
export const getMessagesInputSchema = z.object({
  sessionId: z.string(),
});

// 类型导出
export type Message = z.infer<typeof messageSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Attachment = z.infer<typeof attachmentSchema>;
