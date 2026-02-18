import { os } from "@orpc/server";
import { dialog } from "electron";
import { ipcContext } from "@/ipc/context";
import {
  addKnowledgeInputSchema,
  deleteKnowledgeInputSchema,
  getKnowledgeContentInputSchema,
  listKnowledgeInputSchema,
  reparseKnowledgeInputSchema,
} from "./schemas";
import {
  addKnowledge as addKnowledgeStore,
  deleteKnowledge as deleteKnowledgeStore,
  getKnowledgeContent as getKnowledgeContentStore,
  listKnowledge,
  reparseKnowledge as reparseKnowledgeStore,
} from "./store";

export const getKnowledge = os
  .input(listKnowledgeInputSchema)
  .handler(({ input }) => {
    return listKnowledge(input.workspaceId);
  });

export const addKnowledge = os
  .input(addKnowledgeInputSchema)
  .handler(({ input }) => {
    return addKnowledgeStore(input);
  });

export const deleteKnowledge = os
  .input(deleteKnowledgeInputSchema)
  .handler(({ input }) => {
    const success = deleteKnowledgeStore(input.workspaceId, input.id);
    return { success, id: input.id };
  });

export const reparseKnowledge = os
  .input(reparseKnowledgeInputSchema)
  .handler(({ input }) => {
    return reparseKnowledgeStore(input.workspaceId, input.id);
  });

export const getKnowledgeContent = os
  .input(getKnowledgeContentInputSchema)
  .handler(({ input }) => {
    return getKnowledgeContentStore(input.workspaceId, input.id);
  });

export const selectKnowledgeFiles = os
  .use(ipcContext.mainWindowContext)
  .handler(async ({ context }) => {
    const result = await dialog.showOpenDialog(context.window, {
      properties: ["openFile", "multiSelections"],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return [];
    }
    return result.filePaths;
  });
