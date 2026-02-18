import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { Message } from "@mariozechner/pi-ai";

export function filterToLlmMessages(messages: AgentMessage[]): Message[] {
  return messages.flatMap((message) => {
    if (
      message.role !== "user" &&
      message.role !== "assistant" &&
      message.role !== "toolResult"
    ) {
      return [];
    }
    return [message as Message];
  });
}
