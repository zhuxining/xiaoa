import {
  addProject,
  getProjects,
  readDir,
  readFile,
  removeProject,
  selectFolder,
} from "./handlers";

export const project = {
  list: getProjects,
  add: addProject,
  remove: removeProject,
  readDir,
  readFile,
  selectFolder,
};
