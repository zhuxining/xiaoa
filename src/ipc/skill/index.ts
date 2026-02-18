import {
  createSkill,
  deleteSkill,
  getSkill,
  getSkills,
  updateSkill,
} from "./handlers";

export const skill = {
  list: getSkills,
  get: getSkill,
  create: createSkill,
  update: updateSkill,
  delete: deleteSkill,
};
