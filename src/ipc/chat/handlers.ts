import { os } from "@orpc/server";
import {
  chatAbortInputSchema,
  chatFollowUpInputSchema,
  chatFollowUpResultSchema,
  chatGetContextUsageInputSchema,
  chatGetContextUsageResultSchema,
  chatGetEventsInputSchema,
  chatGetEventsResultSchema,
  chatGetStatsInputSchema,
  chatGetStatsResultSchema,
  chatRespondPermissionInputSchema,
  chatRespondPermissionResultSchema,
  chatSendInputSchema,
  chatSendResultSchema,
  chatSetActiveToolsInputSchema,
  chatSetActiveToolsResultSchema,
  chatSteerInputSchema,
  chatSteerResultSchema,
} from "./schemas";
import {
  abortChatRun,
  followUpChatRun,
  getChatEvents,
  getContextUsage,
  getSessionStats,
  respondChatPermission,
  setActiveTools,
  startChatRun,
  steerChatRun,
} from "./store";

export const send = os
  .input(chatSendInputSchema)
  .output(chatSendResultSchema)
  .handler(({ input }) => {
    return startChatRun(input);
  });

export const abort = os.input(chatAbortInputSchema).handler(({ input }) => {
  return abortChatRun(input);
});

export const events = os
  .input(chatGetEventsInputSchema)
  .output(chatGetEventsResultSchema)
  .handler(({ input }) => {
    return getChatEvents(input);
  });

export const respondPermission = os
  .input(chatRespondPermissionInputSchema)
  .output(chatRespondPermissionResultSchema)
  .handler(({ input }) => {
    return respondChatPermission(input);
  });

export const steer = os
  .input(chatSteerInputSchema)
  .output(chatSteerResultSchema)
  .handler(({ input }) => {
    return steerChatRun(input);
  });

export const followUp = os
  .input(chatFollowUpInputSchema)
  .output(chatFollowUpResultSchema)
  .handler(({ input }) => {
    return followUpChatRun(input);
  });

export const stats = os
  .input(chatGetStatsInputSchema)
  .output(chatGetStatsResultSchema)
  .handler(({ input }) => {
    return getSessionStats(input);
  });

export const contextUsage = os
  .input(chatGetContextUsageInputSchema)
  .output(chatGetContextUsageResultSchema)
  .handler(({ input }) => {
    return getContextUsage(input) ?? null;
  });

export const activeTools = os
  .input(chatSetActiveToolsInputSchema)
  .output(chatSetActiveToolsResultSchema)
  .handler(({ input }) => {
    return setActiveTools(input);
  });
