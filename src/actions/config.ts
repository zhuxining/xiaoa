import { ipc } from "@/ipc/manager";

// 类型定义
export interface LLMConfig {
  provider: "anthropic" | "openai" | "openrouter" | "ollama" | "custom";
  apiKey?: string;
  model: string;
  endpoint?: string;
}

export interface AppPreferences {
  theme: "light" | "dark" | "system";
  language: string;
}

export interface GlobalConfig {
  activeWorkspaceId: string | null;
  llm: LLMConfig;
  preferences: AppPreferences;
}

export interface TestApiKeyResult {
  success: boolean;
  error?: string;
}

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
