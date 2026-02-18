import { appendEvent, generateId } from "../run/run-store";
import type { ActiveRun } from "../run/run-types";
import type { PermissionRisk, PermissionType } from "../schemas";
import { getPermissionPolicy } from "./permission-policy";
import {
  addSessionPermissionAllow,
  isPermissionAllowedInSession,
} from "./permission-store";

export async function requestPermission(
  run: ActiveRun,
  type: PermissionType,
  risk: PermissionRisk,
  title: string,
  description: string,
  details: string
): Promise<void> {
  if (isPermissionAllowedInSession(run.key, type)) {
    return;
  }

  const policy = getPermissionPolicy(run);
  if (policy.mode === "explore" && type !== "file_read") {
    throw new Error("Explore 模式只允许只读操作");
  }

  const dangerous = risk === "high";
  const needConfirm =
    dangerous &&
    (policy.mode === "review" ||
      (policy.mode === "auto" && !policy.dangerousAutoConfirm));

  if (!needConfirm) {
    return;
  }

  const requestId = generateId();

  await new Promise<void>((resolve, reject) => {
    run.pendingPermission = {
      requestId,
      type,
      resolve: (allow, alwaysAllow) => {
        appendEvent(run.key, {
          runId: run.runId,
          scope: run.scope,
          workspaceId: run.workspaceId,
          sessionId: run.sessionId,
          type: "permission_resolved",
          permissionId: requestId,
          permissionType: type,
          decision: allow ? "allow" : "deny",
        });

        run.pendingPermission = null;

        if (!allow) {
          reject(new Error("用户拒绝权限请求"));
          return;
        }

        if (alwaysAllow) {
          addSessionPermissionAllow(run.key, type);
        }

        resolve();
      },
      reject,
    };

    appendEvent(run.key, {
      runId: run.runId,
      scope: run.scope,
      workspaceId: run.workspaceId,
      sessionId: run.sessionId,
      type: "permission_request",
      permissionId: requestId,
      permissionType: type,
      permissionRisk: risk,
      permissionTitle: title,
      permissionDescription: description,
      permissionDetails: details,
    });
  });
}
