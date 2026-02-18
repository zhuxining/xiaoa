import {
  addSkillReferences,
  createSkill,
  deleteSkill,
  exportSkill,
  getSkill,
  getSkills,
  importSkill,
  selectSkillExportDir,
  selectSkillImportDir,
  selectSkillReferenceFiles,
  updateSkill,
} from "./handlers";

export const skill = {
  list: getSkills,
  get: getSkill,
  create: createSkill,
  update: updateSkill,
  delete: deleteSkill,
  importFromDir: importSkill,
  exportToDir: exportSkill,
  addReferences: addSkillReferences,
  selectImportDir: selectSkillImportDir,
  selectExportDir: selectSkillExportDir,
  selectReferenceFiles: selectSkillReferenceFiles,
};
