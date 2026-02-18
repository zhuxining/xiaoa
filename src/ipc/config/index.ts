import {
  getConfig,
  setActiveWorkspace,
  testApiKey,
  updateGlobalConfig,
  updateLLMConfig,
  updatePreferences,
} from "./handlers";

export const config = {
  get: getConfig,
  update: updateGlobalConfig,
  updateLLM: updateLLMConfig,
  updatePreferences,
  setActiveWorkspace,
  testApiKey,
};
