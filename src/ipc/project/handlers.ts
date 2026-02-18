import { os } from "@orpc/server";
import { dialog } from "electron";
import { ipcContext } from "@/ipc/context";
import {
  addProjectInputSchema,
  listProjectsInputSchema,
  readDirInputSchema,
  readFileInputSchema,
  removeProjectInputSchema,
} from "./schemas";
import {
  addProject as addProjectStore,
  listProjects,
  readDir as readDirStore,
  readFile as readFileStore,
  removeProject as removeProjectStore,
} from "./store";

export const getProjects = os
  .input(listProjectsInputSchema)
  .handler(({ input }) => {
    return listProjects(input.workspaceId);
  });

export const addProject = os
  .input(addProjectInputSchema)
  .handler(({ input }) => {
    return addProjectStore(input.workspaceId, input.path);
  });

export const removeProject = os
  .input(removeProjectInputSchema)
  .handler(({ input }) => {
    const success = removeProjectStore(input.workspaceId, input.id);
    return { success, id: input.id };
  });

export const readDir = os.input(readDirInputSchema).handler(({ input }) => {
  return readDirStore(input.path, input.depth ?? 1);
});

export const readFile = os.input(readFileInputSchema).handler(({ input }) => {
  return readFileStore(input.path);
});

export const selectFolder = os
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
