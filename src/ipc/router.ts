import { app } from "./app";
import { config } from "./config";
import { knowledge } from "./knowledge";
import { memory } from "./memory";
import { project } from "./project";
import { shell } from "./shell";
import { sisson } from "./sisson";
import { skill } from "./skill";
import { theme } from "./theme";
import { window } from "./window";
import { workspace } from "./workspace";

export const router = {
  theme,
  window,
  app,
  shell,
  sisson,
  config,
  workspace,
  skill,
  memory,
  knowledge,
  project,
};
