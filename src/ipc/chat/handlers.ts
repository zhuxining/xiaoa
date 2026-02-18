import { os } from "@orpc/server";
import {
  chatAbortInputSchema,
  chatGetEventsInputSchema,
  chatGetEventsResultSchema,
  chatSendInputSchema,
  chatSendResultSchema,
} from "./schemas";
import { abortChatRun, getChatEvents, startChatRun } from "./store";

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
