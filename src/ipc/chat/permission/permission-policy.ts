import { getWorkspace } from "@/ipc/workspace/store";
import type { ActiveRun } from "../run/run-types";

export function getPermissionPolicy(run: ActiveRun): {
  mode: "explore" | "review" | "auto";
  dangerousAutoConfirm: boolean;
} {
  if (run.scope !== "workspace" || !run.workspaceId) {
    return { mode: "review", dangerousAutoConfirm: false };
  }

  const workspace = getWorkspace(run.workspaceId);
  return {
    mode: workspace?.permissions?.mode ?? "review",
    dangerousAutoConfirm: workspace?.permissions?.dangerousAutoConfirm ?? false,
  };
}
