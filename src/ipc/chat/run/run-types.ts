import type { Agent } from "@mariozechner/pi-agent-core";
import type { ChatScope, PermissionType } from "../schemas";

export interface PendingPermission {
  requestId: string;
  type: PermissionType;
  resolve: (allow: boolean, alwaysAllow: boolean) => void;
  reject: (error: Error) => void;
}

export interface ActiveRun {
  runId: string;
  key: string;
  scope: ChatScope;
  workspaceId: string | null;
  sessionId: string;
  content: string;
  aborted: boolean;
  pendingPermission: PendingPermission | null;
  assistantBuffer: string;
  agent?: Agent;
}

export interface ToolContext {
  run: ActiveRun;
  projectRoot: string | null;
}
