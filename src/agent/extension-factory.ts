/**
 * extension-factory.ts - 小A ExtensionFactory
 *
 * 通过 pi 的 ExtensionFactory 接口为每个 ActiveRun 注入：
 * 1. before_agent_start: 动态刷新系统 Prompt（含最新记忆）
 * 2. tool_call: 权限控制（询问用户是否允许 bash/write/edit）
 * 3. registerProvider: 注册自定义 provider（deepseek / ollama / custom）
 */

import type {
  ExtensionAPI,
  ExtensionFactory,
} from "@mariozechner/pi-coding-agent";
import { readConfig } from "@/ipc/config/store";
import { cancelPendingPermissions, requestPermission } from "./permission";
import type { ActiveRun } from "./run/run-types";
import {
  composeGlobalSystemPrompt,
  composeWorkspaceSystemPrompt,
} from "./system-prompt";

/** 无需用户确认、自动放行的工具名称 */
const AUTO_ALLOWED_TOOLS = new Set([
  "read",
  "grep",
  "find",
  "ls",
  "memory_search",
  "memory_write",
  "knowledge_read",
  "knowledge_list",
]);

/**
 * 创建小A专属 ExtensionFactory
 *
 * 每次 createWorkspaceSession / createGlobalSession 时调用，
 * 传入当前 ActiveRun 以便访问 workspaceId、allowedPermissions 等状态。
 */
export function createXiaoaExtension(run: ActiveRun): ExtensionFactory {
  return (pi: ExtensionAPI) => {
    // 注册自定义 provider（deepseek / ollama / custom）
    registerCustomProviders(pi);

    // 每次 prompt 前动态刷新系统 Prompt
    pi.on("before_agent_start", async () => ({
      systemPrompt: run.workspaceId
        ? composeWorkspaceSystemPrompt(run.workspaceId)
        : composeGlobalSystemPrompt(),
    }));

    // 工具调用前权限检查
    pi.on("tool_call", async (event) => {
      // run 已中止
      if (run.aborted) {
        cancelPendingPermissions(run.key);
        return { block: true, reason: "运行已中止" };
      }

      // 自动放行的工具
      if (AUTO_ALLOWED_TOOLS.has(event.toolName)) {
        return;
      }

      // 会话中已允许的工具
      if (run.allowedPermissions.has(event.toolName)) {
        return;
      }

      // 向用户请求权限
      const result = await requestPermission(
        run,
        event.toolName,
        event.input as Record<string, unknown>
      );

      if (result.alwaysAllow && result.decision === "allow") {
        run.allowedPermissions.add(event.toolName);
      }

      if (result.decision === "deny") {
        return { block: true, reason: "操作被用户拒绝" };
      }
    });
  };
}

/**
 * 为 pi 注册非原生 provider 的 baseUrl 和 API key 解析
 */
function registerCustomProviders(pi: ExtensionAPI): void {
  const config = readConfig();
  const { provider, endpoint, apiKey } = config.llm;

  if (provider === "deepseek" && apiKey) {
    pi.registerProvider("deepseek", {
      baseUrl: "https://api.deepseek.com/v1",
      api: "openai-completions",
      apiKey,
    });
  }

  if (provider === "ollama") {
    pi.registerProvider("ollama", {
      baseUrl: endpoint || "http://localhost:11434/v1",
      api: "openai-completions",
      apiKey: "ollama", // ollama 不需要真实 key，占位
    });
  }

  if (provider === "custom" && endpoint && apiKey) {
    pi.registerProvider("custom", {
      baseUrl: endpoint,
      api: "openai-completions",
      apiKey,
    });
  }
}
