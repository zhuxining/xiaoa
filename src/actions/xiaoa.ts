import { ipc } from "@/ipc/manager";

// 类型定义
export type MessageRole = "user" | "assistant";

export interface Attachment {
  name: string;
  path: string;
  mimeType?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  attachments?: Attachment[];
  timestamp: number;
}

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

export interface CreateSessionInput {
  title?: string;
}

export interface UpdateSessionInput {
  id: string;
  title: string;
}

export interface AddMessageInput {
  sessionId: string;
  role: MessageRole;
  content: string;
  attachments?: Attachment[];
}

// 获取所有会话
export async function getSessions(): Promise<Session[]> {
  return ipc.client.xiaoa.listSessions();
}

// 获取单个会话
export async function getSession(id: string): Promise<Session | null> {
  return ipc.client.xiaoa.getSession({ id });
}

// 创建会话
export async function createSession(
  input?: CreateSessionInput
): Promise<Session> {
  return ipc.client.xiaoa.createSession(input ?? {});
}

// 更新会话
export async function updateSession(
  input: UpdateSessionInput
): Promise<Session | null> {
  return ipc.client.xiaoa.updateSession(input);
}

// 删除会话
export async function deleteSession(
  id: string
): Promise<{ success: boolean; id: string }> {
  return ipc.client.xiaoa.deleteSession({ id });
}

// 获取会话消息
export async function getMessages(sessionId: string): Promise<Message[]> {
  return ipc.client.xiaoa.getMessages({ sessionId });
}

// 添加消息
export async function addMessage(
  input: AddMessageInput
): Promise<Message | null> {
  return ipc.client.xiaoa.addMessage(input);
}
