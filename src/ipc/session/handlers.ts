/**
 * session/handlers.ts - Session IPC Handlers（极薄委托）
 *
 * 所有 pi SessionManager 交互已下沉到 src/agent/session-store.ts，
 * 此处仅做 oRPC schema 校验 + 路由。
 */

import { os } from "@orpc/server";
import {
  createSession,
  deleteSession,
  getSession,
  getSessionMessages,
  listSessions,
} from "@/agent/session-store";
import {
  createSessionInputSchema,
  deleteSessionInputSchema,
  getSessionInputSchema,
  getSessionMessagesInputSchema,
  listSessionsInputSchema,
  sessionMetaSchema,
} from "./schemas";

export const sessionRouter = os.router({
  list: os
    .input(listSessionsInputSchema)
    .output(sessionMetaSchema.array())
    .handler(({ input }) => {
      return listSessions(input);
    }),

  get: os
    .input(getSessionInputSchema)
    .output(sessionMetaSchema.nullable())
    .handler(({ input }) => {
      return getSession(input);
    }),

  getMessages: os.input(getSessionMessagesInputSchema).handler(({ input }) => {
    return getSessionMessages(input);
  }),

  create: os
    .input(createSessionInputSchema)
    .output(sessionMetaSchema)
    .handler(({ input }) => {
      return createSession(input);
    }),

  delete: os
    .input(deleteSessionInputSchema)
    .output(sessionMetaSchema.nullable())
    .handler(({ input }) => {
      return deleteSession(input);
    }),
});
