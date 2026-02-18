import { getMemory, saveMemory } from "./handlers";

export const memory = {
  get: getMemory,
  save: saveMemory,
};
