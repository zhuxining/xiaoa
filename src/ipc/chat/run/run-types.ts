import type { Agent } from "@mariozechner/pi-agent-core";
import type { ChatScope, PermissionType } from "../schemas";

export interface PendingPermission {
  reject: (error: Error) => void;
  requestId: string;
  resolve: (allow: boolean, alwaysAllow: boolean) => void;
  type: PermissionType;
}

export interface ActiveRun {
  aborted: boolean;
  agent?: Agent;
  assistantBuffer: string;
  content: string;
  key: string;
  pendingPermission: PendingPermission | null;
  runId: string;
  scope: ChatScope;
  sessionId: string;
  workspaceId: string | null;
}

export interface ToolContext {
  projectRoot: string | null;
  run: ActiveRun;
}
