import { os } from "@orpc/server";
import { getMemoryInputSchema, saveMemoryInputSchema } from "./schemas";
import {
  getMemory as getMemoryStore,
  saveMemory as saveMemoryStore,
} from "./store";

// 获取记忆
export const getMemory = os.input(getMemoryInputSchema).handler(({ input }) => {
  return getMemoryStore(input.workspaceId);
});

// 保存记忆
export const saveMemory = os
  .input(saveMemoryInputSchema)
  .handler(({ input }) => {
    return saveMemoryStore(input.workspaceId, input.content);
  });
