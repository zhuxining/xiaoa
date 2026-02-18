import { ipc } from "@/ipc/manager";

export type ChatScope = "global" | "workspace";

export interface ChatSendInput {
  content: string;
  scope: ChatScope;
  sessionId: string;
  workspaceId?: string;
}

export interface ChatAbortInput {
  runId?: string;
  scope: ChatScope;
  sessionId: string;
  workspaceId?: string;
}

export interface ChatGetEventsInput {
  afterSeq?: number;
  scope: ChatScope;
  sessionId: string;
  workspaceId?: string;
}

export interface ChatEvent {
  args?: string;
  // message events
  content?: string;
  decision?: "allow" | "deny";
  // error events
  error?: string;
  isError?: boolean;
  messagesAfter?: number;
  // compaction events
  messagesBefore?: number;
  permissionDescription?: string;
  permissionDetails?: string;
  // permission events
  permissionId?: string;
  permissionRisk?: "low" | "medium" | "high";
  permissionTitle?: string;
  permissionType?: "file_read" | "file_write" | "execute" | "network";
  runId: string;
  scope: ChatScope;
  seq: number;
  sessionId: string;
  timestamp: number;
  toolCallId?: string;
  // tool events
  toolName?: string;
  type:
    | "run_start"
    | "message_start"
    | "message_delta"
    | "message_end"
    | "tool_start"
    | "tool_end"
    | "tool_call"
    | "tool_result"
    | "compaction"
    | "permission_request"
    | "permission_resolved"
    | "run_aborted"
    | "run_error"
    | "run_end";
  workspaceId: string | null;
}

export interface ChatEventsResult {
  events: ChatEvent[];
  lastSeq: number;
  runId: string | null;
  running: boolean;
}

export interface ChatRespondPermissionInput {
  alwaysAllowInSession?: boolean;
  decision: "allow" | "deny";
  requestId: string;
  runId: string;
  scope: ChatScope;
  sessionId: string;
  workspaceId?: string;
}

export interface ChatSteerInput {
  message: string;
  scope: ChatScope;
  sessionId: string;
  workspaceId?: string;
}

export interface ChatFollowUpInput {
  message: string;
  scope: ChatScope;
  sessionId: string;
  workspaceId?: string;
}

export async function sendChat(
  input: ChatSendInput
): Promise<{ runId: string }> {
  return await ipc.client.chat.send(input);
}

export async function abortChat(
  input: ChatAbortInput
): Promise<{ aborted: boolean }> {
  return await ipc.client.chat.abort(input);
}

export async function getChatEvents(
  input: ChatGetEventsInput
): Promise<ChatEventsResult> {
  return await ipc.client.chat.events(input);
}

export async function respondChatPermission(
  input: ChatRespondPermissionInput
): Promise<{ applied: boolean }> {
  return await ipc.client.chat.respondPermission(input);
}

export async function steerChat(
  input: ChatSteerInput
): Promise<{ queued: boolean }> {
  return await ipc.client.chat.steer(input);
}

export async function followUpChat(
  input: ChatFollowUpInput
): Promise<{ queued: boolean }> {
  return await ipc.client.chat.followUp(input);
}
