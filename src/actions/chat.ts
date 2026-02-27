import type { ChatEvent, ChatScope, ThinkingLevel } from "@/ipc/chat/schemas";
import { ipc } from "@/ipc/manager";

export type { ChatEvent, ChatScope, ThinkingLevel } from "@/ipc/chat/schemas";

export interface ChatSendInput {
  content: string;
  scope: ChatScope;
  sessionId: string;
  thinkingLevel?: ThinkingLevel;
  workspaceId?: string;
  workspaceRootPath?: string;
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
