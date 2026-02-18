import type { ChatEvent, ChatScope } from "../schemas";
import type { ActiveRun } from "./run-types";

export const MAX_EVENTS_PER_SESSION = 1000;

let eventSeq = 0;

export const eventBuffers = new Map<string, ChatEvent[]>();
export const activeRuns = new Map<string, ActiveRun>();

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function requireWorkspaceId(
  scope: ChatScope,
  workspaceId?: string
): string {
  if (scope === "workspace" && !workspaceId) {
    throw new Error("workspace scope requires workspaceId");
  }
  return workspaceId ?? "";
}

export function getSessionKey(
  scope: ChatScope,
  sessionId: string,
  workspaceId?: string
): string {
  const resolvedWorkspaceId = scope === "workspace" ? (workspaceId ?? "") : "";
  return `${scope}:${resolvedWorkspaceId}:${sessionId}`;
}

export function appendEvent(
  key: string,
  event: Omit<ChatEvent, "seq" | "timestamp">
): ChatEvent {
  const fullEvent: ChatEvent = {
    ...event,
    seq: ++eventSeq,
    timestamp: Date.now(),
  };

  const events = eventBuffers.get(key) ?? [];
  events.push(fullEvent);
  if (events.length > MAX_EVENTS_PER_SESSION) {
    events.splice(0, events.length - MAX_EVENTS_PER_SESSION);
  }
  eventBuffers.set(key, events);

  return fullEvent;
}

export function extractMessageText(message: unknown): string {
  if (!message || typeof message !== "object") {
    return "";
  }

  const maybe = message as { content?: unknown };
  if (typeof maybe.content === "string") {
    return maybe.content;
  }
  if (!Array.isArray(maybe.content)) {
    return "";
  }

  return maybe.content
    .map((part) => {
      if (!part || typeof part !== "object") {
        return "";
      }
      const entry = part as { type?: string; text?: string };
      return entry.type === "text" && typeof entry.text === "string"
        ? entry.text
        : "";
    })
    .filter(Boolean)
    .join("");
}
