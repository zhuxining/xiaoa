import { app } from "./app";
import { chat } from "./chat";
import { config } from "./config";
import { knowledge } from "./knowledge";
import { memory } from "./memory";
import { project } from "./project";
import { session } from "./session";
import { shell } from "./shell";
import { skill } from "./skill";
import { theme } from "./theme";
import { window } from "./window";
import { workspace } from "./workspace";

export const router = {
  theme,
  window,
  app,
  chat,
  shell,
  session,
  config,
  workspace,
  skill,
  memory,
  knowledge,
  project,
};
