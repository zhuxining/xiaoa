import { os } from "@orpc/server";
import {
  addMessageInputSchema,
  createSessionInputSchema,
  deleteSessionInputSchema,
  getMessagesInputSchema,
  getSessionInputSchema,
  updateSessionInputSchema,
} from "./schemas";
import {
  addMessage as addMessageStore,
  createSession as createSessionStore,
  deleteSession as deleteSessionStore,
  getMessages as getMessagesStore,
  getSessionStats,
  getSession as getSessionStore,
  listSessions,
  updateSession as updateSessionStore,
} from "./store";

// 获取所有会话列表
export const getSessions = os.handler(() => {
  const sessions = listSessions();
  // 附加消息数量统计
  return sessions.map((session) => ({
    ...session,
    messageCount: getSessionStats(session.id)?.messageCount ?? 0,
  }));
});

// 获取单个会话
export const getSession = os
  .input(getSessionInputSchema)
  .handler(({ input }) => {
    const session = getSessionStore(input.id);
    if (!session) {
      return null;
    }
    const stats = getSessionStats(input.id);
    return {
      ...session,
      messageCount: stats?.messageCount ?? 0,
    };
  });

// 创建会话
export const createSession = os
  .input(createSessionInputSchema)
  .handler(({ input }) => {
    const session = createSessionStore(input.title, input.projectId);
    return {
      ...session,
      messageCount: 0,
    };
  });

// 更新会话
export const updateSession = os
  .input(updateSessionInputSchema)
  .handler(({ input }) => {
    const session = updateSessionStore(input.id, input.title);
    if (!session) {
      return null;
    }
    const stats = getSessionStats(input.id);
    return {
      ...session,
      messageCount: stats?.messageCount ?? 0,
    };
  });

// 删除会话
export const deleteSession = os
  .input(deleteSessionInputSchema)
  .handler(({ input }) => {
    const success = deleteSessionStore(input.id);
    return { success, id: input.id };
  });

// 获取会话消息
export const getMessages = os
  .input(getMessagesInputSchema)
  .handler(({ input }) => {
    return getMessagesStore(input.sessionId);
  });

// 添加消息
export const addMessage = os
  .input(addMessageInputSchema)
  .handler(({ input }) => {
    return addMessageStore(
      input.sessionId,
      input.role,
      input.content,
      input.attachments
    );
  });
