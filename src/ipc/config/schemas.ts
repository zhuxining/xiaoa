import { z } from "zod";

// LLM 配置
export const llmConfigSchema = z.object({
  provider: z.enum(["anthropic", "openai", "openrouter", "ollama", "custom"]),
  apiKey: z.string().optional(),
  model: z.string(),
  endpoint: z.string().optional(),
});

// 应用偏好
export const appPreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  language: z.string(),
});

// 全局配置
export const globalConfigSchema = z.object({
  activeWorkspaceId: z.string().nullable(),
  llm: llmConfigSchema,
  preferences: appPreferencesSchema,
});

// 输入 schemas
export const updateConfigInputSchema = globalConfigSchema.partial();

export const updateLLMConfigInputSchema = llmConfigSchema.partial();

export const updatePreferencesInputSchema = appPreferencesSchema.partial();

// API Key 测试
export const testApiKeyInputSchema = z.object({
  provider: z.enum(["anthropic", "openai", "openrouter", "ollama", "custom"]),
  apiKey: z.string(),
  endpoint: z.string().optional(),
});

export const testApiKeyResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});
