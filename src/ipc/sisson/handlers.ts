import { os } from "@orpc/server";
import {
  addMessage as addGlobalMessage,
  createSession as createGlobalSession,
  deleteSession as deleteGlobalSession,
  getMessages as getGlobalMessages,
  getSession as getGlobalSession,
  getSessionStats as getGlobalSessionStats,
  listSessions as listGlobalSessions,
  updateSession as updateGlobalSession,
} from "./global-store";
import {
  addMessageInputSchema,
  createSissonInputSchema,
  deleteSissonInputSchema,
  getMessagesInputSchema,
  getSissonInputSchema,
  listSissonsInputSchema,
  updateSissonInputSchema,
} from "./schemas";
import {
  addMessage as addWorkspaceMessage,
  createSession as createWorkspaceSession,
  deleteSession as deleteWorkspaceSession,
  getMessages as getWorkspaceMessages,
  getSession as getWorkspaceSession,
  getSessionStats as getWorkspaceSessionStats,
  listSessions as listWorkspaceSessions,
  updateSession as updateWorkspaceSession,
} from "./workspace-store";

function requireWorkspaceId(
  scope: "global" | "workspace",
  workspaceId?: string
): string {
  if (scope === "workspace" && !workspaceId) {
    throw new Error("workspace scope requires workspaceId");
  }
  return workspaceId ?? "";
}

export const listSissons = os
  .input(listSissonsInputSchema)
  .handler(({ input }) => {
    if (input.scope === "global") {
      const sessions = listGlobalSessions();
      return sessions.map((session) => ({
        ...session,
        scope: "global" as const,
        workspaceId: null,
        projectId: null,
        messageCount: getGlobalSessionStats(session.id)?.messageCount ?? 0,
      }));
    }

    const workspaceId = requireWorkspaceId(input.scope, input.workspaceId);
    const sessions = listWorkspaceSessions(workspaceId, input.projectId);
    return sessions.map((session) => ({
      ...session,
      scope: "workspace" as const,
      messageCount:
        getWorkspaceSessionStats(workspaceId, session.id)?.messageCount ?? 0,
    }));
  });

export const getSisson = os.input(getSissonInputSchema).handler(({ input }) => {
  if (input.scope === "global") {
    const session = getGlobalSession(input.id);
    if (!session) {
      return null;
    }

    return {
      ...session,
      scope: "global" as const,
      workspaceId: null,
      projectId: null,
      messageCount: getGlobalSessionStats(input.id)?.messageCount ?? 0,
    };
  }

  const workspaceId = requireWorkspaceId(input.scope, input.workspaceId);
  const session = getWorkspaceSession(workspaceId, input.id);
  if (!session) {
    return null;
  }

  return {
    ...session,
    scope: "workspace" as const,
    messageCount:
      getWorkspaceSessionStats(workspaceId, input.id)?.messageCount ?? 0,
  };
});

export const createSisson = os
  .input(createSissonInputSchema)
  .handler(({ input }) => {
    if (input.scope === "global") {
      const session = createGlobalSession(input.title);
      return {
        ...session,
        scope: "global" as const,
        workspaceId: null,
        projectId: null,
        messageCount: 0,
      };
    }

    const workspaceId = requireWorkspaceId(input.scope, input.workspaceId);
    const session = createWorkspaceSession(
      workspaceId,
      input.title,
      input.projectId
    );
    return {
      ...session,
      scope: "workspace" as const,
      messageCount: 0,
    };
  });

export const updateSisson = os
  .input(updateSissonInputSchema)
  .handler(({ input }) => {
    if (input.scope === "global") {
      const session = updateGlobalSession(input.id, input.title);
      if (!session) {
        return null;
      }

      return {
        ...session,
        scope: "global" as const,
        workspaceId: null,
        projectId: null,
        messageCount: getGlobalSessionStats(input.id)?.messageCount ?? 0,
      };
    }

    const workspaceId = requireWorkspaceId(input.scope, input.workspaceId);
    const session = updateWorkspaceSession(workspaceId, input.id, input.title);
    if (!session) {
      return null;
    }

    return {
      ...session,
      scope: "workspace" as const,
      messageCount:
        getWorkspaceSessionStats(workspaceId, input.id)?.messageCount ?? 0,
    };
  });

export const deleteSisson = os
  .input(deleteSissonInputSchema)
  .handler(({ input }) => {
    if (input.scope === "global") {
      const success = deleteGlobalSession(input.id);
      return { success, id: input.id };
    }

    const workspaceId = requireWorkspaceId(input.scope, input.workspaceId);
    const success = deleteWorkspaceSession(workspaceId, input.id);
    return { success, id: input.id };
  });

export const getMessages = os
  .input(getMessagesInputSchema)
  .handler(({ input }) => {
    if (input.scope === "global") {
      return getGlobalMessages(input.sessionId);
    }

    const workspaceId = requireWorkspaceId(input.scope, input.workspaceId);
    return getWorkspaceMessages(workspaceId, input.sessionId);
  });

export const addMessage = os
  .input(addMessageInputSchema)
  .handler(({ input }) => {
    if (input.scope === "global") {
      return addGlobalMessage(
        input.sessionId,
        input.role,
        input.content,
        input.attachments
      );
    }

    const workspaceId = requireWorkspaceId(input.scope, input.workspaceId);
    return addWorkspaceMessage(
      workspaceId,
      input.sessionId,
      input.role,
      input.content,
      input.attachments
    );
  });
