/**
 * session.ts - Session Actions
 *
 * 封装 session IPC 调用，提供类型安全的客户端 API。
 */

import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { ipc } from "@/ipc/manager";
import type {
  CreateSessionInput,
  DeleteSessionInput,
  GetSessionInput,
  GetSessionMessagesInput,
  ListSessionsInput,
  SessionMeta,
} from "@/ipc/session/schemas";

/**
 * 列出会话
 */
export async function listSessions(
  input: ListSessionsInput
): Promise<SessionMeta[]> {
  return await ipc.client.session.list(input);
}

/**
 * 获取单个会话
 */
export async function getSession(
  input: GetSessionInput
): Promise<SessionMeta | null> {
  return await ipc.client.session.get(input);
}

/**
 * 获取会话消息
 */
export async function getSessionMessages(
  input: GetSessionMessagesInput
): Promise<AgentMessage[]> {
  return await ipc.client.session.getMessages(input);
}

/**
 * 创建会话
 */
export async function createSession(
  input: CreateSessionInput
): Promise<SessionMeta> {
  return await ipc.client.session.create(input);
}

/**
 * 删除会话
 */
export async function deleteSession(
  input: DeleteSessionInput
): Promise<SessionMeta | null> {
  return await ipc.client.session.delete(input);
}

// 重导出类型
export type { SessionMeta } from "@/ipc/session/schemas";
