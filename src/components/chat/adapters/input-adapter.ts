import type { ChatStatus } from "ai";

export function toChatStatus(
  isGenerating: boolean,
  disabled: boolean
): ChatStatus {
  if (isGenerating) {
    return "streaming";
  }
  if (disabled) {
    return "error";
  }
  return "ready";
}
