import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { extractMessageText } from "../run/run-store";
import type { ActiveRun } from "../run/run-types";
import { appendDailyLog } from "../tools/memory-tools";

const COMPACTION_CHAR_LIMIT = 14_000;

function estimateTotalChars(messages: AgentMessage[]): number {
  let total = 0;
  for (const message of messages) {
    total += extractMessageText(message).length;
  }
  return total;
}

export function preCompactionFlush(
  workspaceId: string,
  messages: AgentMessage[]
): void {
  const flushItems = messages.map((message) => {
    const role = message.role;
    const text = extractMessageText(message).slice(0, 500);
    return `- ${role}: ${text}`;
  });

  appendDailyLog(workspaceId, "Pre-compaction flush", flushItems.join("\n"));
}

export function maybeCompactMessages(
  run: ActiveRun,
  messages: AgentMessage[]
): AgentMessage[] {
  const totalChars = estimateTotalChars(messages);
  if (totalChars <= COMPACTION_CHAR_LIMIT) {
    return messages;
  }

  const workspaceId = run.workspaceId;
  if (!workspaceId) {
    return messages;
  }

  preCompactionFlush(workspaceId, messages);

  const summaryItems: string[] = [];
  for (let i = 0; i < Math.min(messages.length, 5); i++) {
    const message = messages[i];
    summaryItems.push(
      `${message.role}: ${extractMessageText(message).slice(0, 200)}`
    );
  }

  const remaining = messages.slice(-3);

  const summary: AgentMessage = {
    role: "user",
    content: `历史上下文摘要（自动压缩）:\n${summaryItems.join("\n")}\n\n以上为历史对话摘要，后续为最新对话。`,
    timestamp: Date.now(),
  };

  return [summary, ...remaining];
}

export function buildContextTransform(
  run: ActiveRun
): (messages: AgentMessage[]) => Promise<AgentMessage[]> {
  return (messages: AgentMessage[]) => {
    const compacted = maybeCompactMessages(run, messages);
    return Promise.resolve(compacted);
  };
}
