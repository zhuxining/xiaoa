import { os } from "@orpc/server";
import {
  globalConfigSchema,
  testApiKeyInputSchema,
  testApiKeyResultSchema,
  updateConfigInputSchema,
  updateLLMConfigInputSchema,
  updatePreferencesInputSchema,
} from "./schemas";
import { readConfig, updateConfig } from "./store";

// 获取全局配置
export const getConfig = os.handler(() => {
  return readConfig();
});

// 更新全局配置
export const updateGlobalConfig = os
  .input(updateConfigInputSchema)
  .handler(({ input }) => {
    return updateConfig(input);
  });

// 更新 LLM 配置
export const updateLLMConfig = os
  .input(updateLLMConfigInputSchema)
  .handler(({ input }) => {
    const current = readConfig();
    return updateConfig({
      llm: { ...current.llm, ...input },
    });
  });

// 更新偏好设置
export const updatePreferences = os
  .input(updatePreferencesInputSchema)
  .handler(({ input }) => {
    const current = readConfig();
    return updateConfig({
      preferences: { ...current.preferences, ...input },
    });
  });

// 设置活跃工作区
export const setActiveWorkspace = os
  .input(globalConfigSchema.shape.activeWorkspaceId)
  .handler(({ input }) => {
    return updateConfig({ activeWorkspaceId: input });
  });

// 测试 API Key 连接
export const testApiKey = os
  .input(testApiKeyInputSchema)
  .output(testApiKeyResultSchema)
  .handler(async ({ input }) => {
    const { provider, apiKey, endpoint } = input;

    if (!apiKey) {
      return { success: false, error: "API Key 不能为空" };
    }

    try {
      switch (provider) {
        case "anthropic": {
          const response = await fetch("https://api.anthropic.com/v1/models", {
            headers: {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
          });
          if (response.ok) {
            return { success: true };
          }
          return {
            success: false,
            error: `连接失败: ${response.status} ${response.statusText}`,
          };
        }

        case "openai": {
          const response = await fetch("https://api.openai.com/v1/models", {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          });
          if (response.ok) {
            return { success: true };
          }
          return {
            success: false,
            error: `连接失败: ${response.status} ${response.statusText}`,
          };
        }

        case "deepseek": {
          const response = await fetch("https://api.deepseek.com/v1/models", {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (response.ok) {
            return { success: true };
          }
          return {
            success: false,
            error: `连接失败: ${response.status} ${response.statusText}`,
          };
        }

        case "openrouter": {
          const response = await fetch("https://openrouter.ai/api/v1/models", {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          });
          if (response.ok) {
            return { success: true };
          }
          return {
            success: false,
            error: `连接失败: ${response.status} ${response.statusText}`,
          };
        }

        case "ollama": {
          const baseUrl = endpoint || "http://localhost:11434";
          const response = await fetch(`${baseUrl}/api/tags`);
          if (response.ok) {
            return { success: true };
          }
          return {
            success: false,
            error: `连接失败: ${response.status} ${response.statusText}`,
          };
        }

        case "custom": {
          if (!endpoint) {
            return { success: false, error: "自定义端点不能为空" };
          }
          const response = await fetch(`${endpoint}/models`, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          });
          if (response.ok) {
            return { success: true };
          }
          return {
            success: false,
            error: `连接失败: ${response.status} ${response.statusText}`,
          };
        }

        default:
          return { success: false, error: "不支持的 Provider" };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      return { success: false, error: `连接失败: ${message}` };
    }
  });
