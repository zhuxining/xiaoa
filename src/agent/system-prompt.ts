/**
 * system-prompt.ts - 系统 Prompt 组合
 *
 * 根据工作区上下文动态组合系统提示。
 * 每次 before_agent_start 时调用，确保注入最新记忆。
 */

import { getMemory } from "@/ipc/memory/store";
import { getWorkspace } from "@/ipc/workspace/store";

/** 工作区对话系统提示（含记忆） */
export function composeWorkspaceSystemPrompt(workspaceId: string): string {
  const workspace = getWorkspace(workspaceId);
  const memory = getMemory(workspaceId).content.slice(0, 2200);

  return [
    workspace?.agent?.systemPrompt || "你是一个专业、务实的助手。",
    "",
    "长期记忆（节选）：",
    memory || "（暂无记忆）",
  ].join("\n");
}

/** 全局（无项目）对话系统提示 */
export function composeGlobalSystemPrompt(): string {
  return "你是小 A，一个友好、专业的 AI 助手。你可以帮助用户完成各种任务。";
}
