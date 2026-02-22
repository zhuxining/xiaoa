/**
 * session.ts - Session Actions
 *
 * 封装 session IPC 调用，提供类型安全的客户端 API。
 * workspaceId 为 null 时表示全局（小A）会话。
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

export async function listSessions(
  input: ListSessionsInput
): Promise<SessionMeta[]> {
  return await ipc.client.session.list(input);
}

export async function getSession(
  input: GetSessionInput
): Promise<SessionMeta | null> {
  return await ipc.client.session.get(input);
}

export async function getSessionMessages(
  input: GetSessionMessagesInput
): Promise<AgentMessage[]> {
  return await ipc.client.session.getMessages(input);
}

export async function createSession(
  input: CreateSessionInput
): Promise<SessionMeta> {
  return await ipc.client.session.create(input);
}

export async function deleteSession(
  input: DeleteSessionInput
): Promise<SessionMeta | null> {
  return await ipc.client.session.delete(input);
}

export type { SessionMeta } from "@/ipc/session/schemas";
