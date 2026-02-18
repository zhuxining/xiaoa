import { os } from "@orpc/server";
import {
  createWorkspaceInputSchema,
  deleteWorkspaceInputSchema,
  getWorkspaceInputSchema,
  updateWorkspaceInputSchema,
} from "./schemas";
import {
  createWorkspace as createWorkspaceStore,
  deleteWorkspace as deleteWorkspaceStore,
  getWorkspace as getWorkspaceStore,
  listWorkspaces,
  updateWorkspace as updateWorkspaceStore,
} from "./store";

// 获取所有工作区列表
export const getWorkspaces = os.handler(() => {
  return listWorkspaces();
});

// 获取单个工作区
export const getWorkspace = os
  .input(getWorkspaceInputSchema)
  .handler(({ input }) => {
    return getWorkspaceStore(input.id);
  });

// 创建工作区
export const createWorkspace = os
  .input(createWorkspaceInputSchema)
  .handler(({ input }) => {
    return createWorkspaceStore(input.name, input.agent);
  });

// 更新工作区
export const updateWorkspace = os
  .input(updateWorkspaceInputSchema)
  .handler(({ input }) => {
    const { id, ...updates } = input;
    return updateWorkspaceStore(id, updates);
  });

// 删除工作区
export const deleteWorkspace = os
  .input(deleteWorkspaceInputSchema)
  .handler(({ input }) => {
    const success = deleteWorkspaceStore(input.id);
    return { success, id: input.id };
  });
