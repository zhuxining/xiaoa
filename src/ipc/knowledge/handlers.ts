import { os } from "@orpc/server";
import {
  addKnowledgeInputSchema,
  deleteKnowledgeInputSchema,
  listKnowledgeInputSchema,
} from "./schemas";
import {
  addKnowledge as addKnowledgeStore,
  deleteKnowledge as deleteKnowledgeStore,
  listKnowledge,
} from "./store";

export const getKnowledge = os
  .input(listKnowledgeInputSchema)
  .handler(({ input }) => {
    return listKnowledge(input.workspaceId);
  });

export const addKnowledge = os
  .input(addKnowledgeInputSchema)
  .handler(({ input }) => {
    return addKnowledgeStore(
      input.workspaceId,
      input.name,
      input.type,
      input.source
    );
  });

export const deleteKnowledge = os
  .input(deleteKnowledgeInputSchema)
  .handler(({ input }) => {
    const success = deleteKnowledgeStore(input.workspaceId, input.id);
    return { success, id: input.id };
  });
