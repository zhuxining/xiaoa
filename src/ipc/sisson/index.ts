import {
  addMessage,
  createSisson,
  deleteSisson,
  getMessages,
  getSisson,
  listSissons,
  updateSisson,
} from "./handlers";

export const sisson = {
  list: listSissons,
  get: getSisson,
  create: createSisson,
  update: updateSisson,
  delete: deleteSisson,
  getMessages,
  addMessage,
};
