import { addKnowledge, deleteKnowledge, getKnowledge } from "./handlers";

export const knowledge = {
  list: getKnowledge,
  add: addKnowledge,
  delete: deleteKnowledge,
};
