import { ipc } from "@/ipc/manager";

export type ChatScope = "global" | "workspace";

export interface ChatSendInput {
  scope: ChatScope;
  workspaceId?: string;
  sessionId: string;
  content: string;
}

export interface ChatAbortInput {
  scope: ChatScope;
  workspaceId?: string;
  sessionId: string;
  runId?: string;
}

export interface ChatGetEventsInput {
  scope: ChatScope;
  workspaceId?: string;
  sessionId: string;
  afterSeq?: number;
}

export interface ChatEvent {
  seq: number;
  runId: string;
  scope: ChatScope;
  workspaceId: string | null;
  sessionId: string;
  type:
    | "run_start"
    | "message_start"
    | "message_delta"
    | "message_end"
    | "tool_start"
    | "tool_end"
    | "run_aborted"
    | "run_error"
    | "run_end";
  timestamp: number;
  content?: string;
  toolName?: string;
  error?: string;
}

export interface ChatEventsResult {
  events: ChatEvent[];
  lastSeq: number;
  running: boolean;
  runId: string | null;
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
