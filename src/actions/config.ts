import type { z } from "zod";
import type {
  appPreferencesSchema,
  globalConfigSchema,
  llmConfigSchema,
  testApiKeyResultSchema,
} from "@/ipc/config/schemas";
import { ipc } from "@/ipc/manager";

// 类型定义 - 从 schemas 推导
export type LLMConfig = z.infer<typeof llmConfigSchema>;
export type AppPreferences = z.infer<typeof appPreferencesSchema>;
export type GlobalConfig = z.infer<typeof globalConfigSchema>;
export type TestApiKeyResult = z.infer<typeof testApiKeyResultSchema>;

// 获取全局配置
export async function getConfig(): Promise<GlobalConfig> {
  return await ipc.client.config.get();
}

// 更新全局配置
export async function updateConfig(
  updates: Partial<GlobalConfig>
): Promise<GlobalConfig> {
  return await ipc.client.config.update(updates);
}

// 更新 LLM 配置
export async function updateLLMConfig(
  updates: Partial<LLMConfig>
): Promise<GlobalConfig> {
  return await ipc.client.config.updateLLM(updates);
}

// 更新偏好设置
export async function updatePreferences(
  updates: Partial<AppPreferences>
): Promise<GlobalConfig> {
  return await ipc.client.config.updatePreferences(updates);
}

// 设置活跃工作区
export async function setActiveWorkspace(
  workspaceId: string | null
): Promise<GlobalConfig> {
  return await ipc.client.config.setActiveWorkspace(workspaceId);
}

// 测试 API Key 连接
export async function testApiKey(
  provider: LLMConfig["provider"],
  apiKey: string,
  endpoint?: string
): Promise<TestApiKeyResult> {
  return await ipc.client.config.testApiKey({ provider, apiKey, endpoint });
}
