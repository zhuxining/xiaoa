import { os } from "@orpc/server";
import { dialog } from "electron";
import { ipcContext } from "@/ipc/context";
import {
  addSkillReferencesInputSchema,
  createSkillInputSchema,
  deleteSkillInputSchema,
  exportSkillInputSchema,
  getSkillInputSchema,
  importSkillInputSchema,
  listSkillsInputSchema,
  updateSkillInputSchema,
} from "./schemas";
import {
  addSkillReferences as addSkillReferencesStore,
  createSkill as createSkillStore,
  deleteSkill as deleteSkillStore,
  exportSkillToDir as exportSkillToDirStore,
  getSkill as getSkillStore,
  importSkillFromDir as importSkillFromDirStore,
  listSkills,
  updateSkill as updateSkillStore,
} from "./store";

export const getSkills = os
  .input(listSkillsInputSchema)
  .handler(({ input }) => {
    return listSkills(input.workspaceId);
  });

export const getSkill = os.input(getSkillInputSchema).handler(({ input }) => {
  return getSkillStore(input.workspaceId, input.id);
});

export const createSkill = os
  .input(createSkillInputSchema)
  .handler(({ input }) => {
    return createSkillStore(
      input.workspaceId,
      input.name,
      input.prompt,
      input.description,
      input.icon,
      input.argumentHint
    );
  });

export const updateSkill = os
  .input(updateSkillInputSchema)
  .handler(({ input }) => {
    const { id, workspaceId, ...updates } = input;
    return updateSkillStore(workspaceId, id, updates);
  });

export const deleteSkill = os
  .input(deleteSkillInputSchema)
  .handler(({ input }) => {
    const success = deleteSkillStore(input.workspaceId, input.id);
    return { success, id: input.id };
  });

export const importSkill = os
  .input(importSkillInputSchema)
  .handler(({ input }) => {
    return importSkillFromDirStore(input.workspaceId, input.dirPath);
  });

export const exportSkill = os
  .input(exportSkillInputSchema)
  .handler(({ input }) => {
    return exportSkillToDirStore(input.workspaceId, input.id, input.targetDir);
  });

export const addSkillReferences = os
  .input(addSkillReferencesInputSchema)
  .handler(({ input }) => {
    return addSkillReferencesStore(
      input.workspaceId,
      input.id,
      input.filePaths
    );
  });

export const selectSkillImportDir = os
  .use(ipcContext.mainWindowContext)
  .handler(async ({ context }) => {
    const result = await dialog.showOpenDialog(context.window, {
      properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

export const selectSkillExportDir = os
  .use(ipcContext.mainWindowContext)
  .handler(async ({ context }) => {
    const result = await dialog.showOpenDialog(context.window, {
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

export const selectSkillReferenceFiles = os
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
