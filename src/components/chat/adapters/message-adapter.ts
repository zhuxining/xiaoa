import type {
  AssistantMessage,
  Message,
  UserMessage,
} from "@mariozechner/pi-ai";
import type { ConversationMessage } from "@/components/ai-elements/conversation";

type ContentMessage = UserMessage | AssistantMessage;

function hasContent(msg: unknown): msg is ContentMessage {
  return (
    typeof msg === "object" &&
    msg !== null &&
    "content" in msg &&
    (msg as ContentMessage).role !== undefined
  );
}

export function toConversationMessage(msg: Message): ConversationMessage {
  return {
    role: mapRole(msg.role),
    content: extractTextContent(msg),
  };
}

function mapRole(role: string): ConversationMessage["role"] {
  switch (role) {
    case "user":
      return "user";
    case "assistant":
      return "assistant";
    case "toolResult":
      return "tool";
    default:
      return "data";
  }
}

function extractTextContent(msg: Message): string {
  if (!hasContent(msg)) {
    return "";
  }

  if (typeof msg.content === "string") {
    return msg.content;
  }
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((c): c is { type: "text"; text: string } => c?.type === "text")
      .map((c) => c.text)
      .join("\n");
  }
  return "";
}

export function toConversationMessages(
  messages: Message[]
): ConversationMessage[] {
  return messages.filter(hasContent).map(toConversationMessage);
}
