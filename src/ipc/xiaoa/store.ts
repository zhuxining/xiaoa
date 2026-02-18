import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import type { z } from "zod";
import type { messageSchema, sessionSchema } from "./schemas";

type Message = z.infer<typeof messageSchema>;
type Session = z.infer<typeof sessionSchema>;

// 获取小A数据根目录
function getXiaoaRoot(): string {
  const userDataPath = app.getPath("userData");
  return join(userDataPath, "xiaoa");
}

// 获取会话目录
function getSessionsDir(): string {
  return join(getXiaoaRoot(), "sessions");
}

// 获取会话元数据文件路径
function getSessionsIndexPath(): string {
  return join(getSessionsDir(), "index.json");
}

// 获取会话消息文件路径
function getSessionMessagesPath(sessionId: string): string {
  return join(getSessionsDir(), `${sessionId}.jsonl`);
}

// 确保目录存在
function ensureSessionsDir(): void {
  const dir = getSessionsDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// 生成唯一 ID
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// 读取会话索引（兼容旧数据：projectId 缺失时 fallback 为 null）
function readSessionsIndex(): Session[] {
  const indexPath = getSessionsIndexPath();
  if (!existsSync(indexPath)) {
    return [];
  }

  try {
    const content = readFileSync(indexPath, "utf-8");
    const raw = JSON.parse(content) as (Session & {
      projectId?: string | null;
    })[];
    return raw.map((s) => ({ ...s, projectId: s.projectId ?? null }));
  } catch {
    return [];
  }
}

// 写入会话索引
function writeSessionsIndex(sessions: Session[]): void {
  ensureSessionsDir();
  const indexPath = getSessionsIndexPath();
  writeFileSync(indexPath, JSON.stringify(sessions, null, 2), "utf-8");
}

// 列出所有会话
export function listSessions(): Session[] {
  const sessions = readSessionsIndex();
  return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}

// 获取单个会话
export function getSession(id: string): Session | null {
  const sessions = readSessionsIndex();
  return sessions.find((s) => s.id === id) ?? null;
}

// 创建会话
export function createSession(
  title?: string,
  projectId?: string | null
): Session {
  ensureSessionsDir();

  const id = generateId();
  const now = Date.now();
  const session: Session = {
    id,
    projectId: projectId ?? null,
    title: title ?? "新会话",
    createdAt: now,
    updatedAt: now,
  };

  // 添加到索引
  const sessions = readSessionsIndex();
  sessions.push(session);
  writeSessionsIndex(sessions);

  // 创建空的消息文件
  const messagesPath = getSessionMessagesPath(id);
  writeFileSync(messagesPath, "", "utf-8");

  return session;
}

// 更新会话
export function updateSession(id: string, title: string): Session | null {
  const sessions = readSessionsIndex();
  const index = sessions.findIndex((s) => s.id === id);

  if (index === -1) {
    return null;
  }

  sessions[index] = {
    ...sessions[index],
    title,
    updatedAt: Date.now(),
  };

  writeSessionsIndex(sessions);
  return sessions[index];
}

// 更新会话时间戳（内部使用）
export function touchSession(id: string): void {
  const sessions = readSessionsIndex();
  const index = sessions.findIndex((s) => s.id === id);

  if (index !== -1) {
    sessions[index].updatedAt = Date.now();
    writeSessionsIndex(sessions);
  }
}

// 删除会话
export function deleteSession(id: string): boolean {
  const sessions = readSessionsIndex();
  const index = sessions.findIndex((s) => s.id === id);

  if (index === -1) {
    return false;
  }

  // 从索引中移除
  sessions.splice(index, 1);
  writeSessionsIndex(sessions);

  // 删除消息文件
  const messagesPath = getSessionMessagesPath(id);
  if (existsSync(messagesPath)) {
    unlinkSync(messagesPath);
  }

  return true;
}

// 添加消息到会话
export function addMessage(
  sessionId: string,
  role: Message["role"],
  content: string,
  attachments?: Message["attachments"]
): Message | null {
  // 检查会话是否存在
  if (!getSession(sessionId)) {
    return null;
  }

  const message: Message = {
    id: generateId(),
    role,
    content,
    attachments,
    timestamp: Date.now(),
  };

  // 追加到 JSONL 文件
  const messagesPath = getSessionMessagesPath(sessionId);
  const line = JSON.stringify(message);
  appendFileSync(messagesPath, `${line}\n`, "utf-8");

  // 更新会话时间戳
  touchSession(sessionId);

  return message;
}

// 获取会话的所有消息
export function getMessages(sessionId: string): Message[] {
  const messagesPath = getSessionMessagesPath(sessionId);
  if (!existsSync(messagesPath)) {
    return [];
  }

  const messages: Message[] = [];
  const content = readFileSync(messagesPath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());

  for (const line of lines) {
    try {
      messages.push(JSON.parse(line) as Message);
    } catch {
      // 忽略解析失败的行
    }
  }

  return messages;
}

// 获取会话统计信息
export function getSessionStats(
  sessionId: string
): { messageCount: number } | null {
  if (!getSession(sessionId)) {
    return null;
  }

  const messages = getMessages(sessionId);
  return { messageCount: messages.length };
}
