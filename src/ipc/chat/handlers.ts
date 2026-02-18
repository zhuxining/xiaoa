import { os } from "@orpc/server";
import {
  chatAbortInputSchema,
  chatGetEventsInputSchema,
  chatGetEventsResultSchema,
  chatRespondPermissionInputSchema,
  chatRespondPermissionResultSchema,
  chatSendInputSchema,
  chatSendResultSchema,
} from "./schemas";
import {
  abortChatRun,
  getChatEvents,
  respondChatPermission,
  startChatRun,
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
