import {
  addKnowledge,
  deleteKnowledge,
  getKnowledge,
  getKnowledgeContent,
  reparseKnowledge,
  selectKnowledgeFiles,
} from "./handlers";

export const knowledge = {
  list: getKnowledge,
  add: addKnowledge,
  delete: deleteKnowledge,
  reparse: reparseKnowledge,
  getContent: getKnowledgeContent,
  selectFiles: selectKnowledgeFiles,
};
