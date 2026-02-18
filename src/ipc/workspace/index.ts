import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  getWorkspaces,
  updateWorkspace,
} from "./handlers";

export const workspace = {
  list: getWorkspaces,
  get: getWorkspace,
  create: createWorkspace,
  update: updateWorkspace,
  delete: deleteWorkspace,
};
