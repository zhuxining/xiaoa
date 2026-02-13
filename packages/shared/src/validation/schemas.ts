/**
 * Unified validation schemas (zod)
 */

import { z } from "zod";

// ID 格式
export const workspaceIdSchema = z.string().regex(/^ws_[a-zA-Z0-9_-]+$/);
export const sessionIdSchema = z.string().regex(/^session_[a-zA-Z0-9_-]+$/);
export const messageIdSchema = z.string().regex(/^msg_[a-zA-Z0-9_-]+$/);
export const projectIdSchema = z.string().regex(/^proj_[a-zA-Z0-9_-]+$/);

// 配置校验
export const workspaceNameSchema = z.string().min(1).max(50).trim();
export const apiKeySchema = z.string().min(20);
export const modelNameSchema = z.string().min(1);

// URL（zod 4 顶层 API）
export const httpUrlSchema = z
	.url()
	.check(z.refine((val) => val.startsWith("http")));
export const httpsUrlSchema = z
	.url()
	.check(z.refine((val) => val.startsWith("https")));
export const wsUrlSchema = z
	.url()
	.check(z.refine((val) => val.startsWith("ws")));

// 兼容性：保留布尔返回函数
export const isValidWorkspaceId = (id: string) =>
	workspaceIdSchema.safeParse(id).success;
export const isValidSessionId = (id: string) =>
	sessionIdSchema.safeParse(id).success;
export const isValidMessageId = (id: string) =>
	messageIdSchema.safeParse(id).success;
export const isValidProjectId = (id: string) =>
	projectIdSchema.safeParse(id).success;

export const isValidHttpUrl = (url: string) =>
	httpUrlSchema.safeParse(url).success;
export const isValidHttpsUrl = (url: string) =>
	httpsUrlSchema.safeParse(url).success;
export const isValidWsUrl = (url: string) => wsUrlSchema.safeParse(url).success;
