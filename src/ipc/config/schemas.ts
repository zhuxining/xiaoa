import { z } from "zod";

// All supported providers (pi-ai KnownProvider + custom OpenAI-compatible)
export const providerSchema = z.enum([
  // pi-ai native providers
  "anthropic",
  "openai",
  "azure-openai-responses",
  "openai-codex",
  "google",
  "google-vertex",
  "google-gemini-cli",
  "xai",
  "groq",
  "cerebras",
  "openrouter",
  "vercel-ai-gateway",
  "mistral",
  "minimax",
  "kimi-coding",
  // Custom OpenAI-compatible providers
  "deepseek",
  "ollama",
  "custom",
]);

// LLM 配置
export const llmConfigSchema = z.object({
  provider: providerSchema,
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
  provider: providerSchema,
  apiKey: z.string(),
  endpoint: z.string().optional(),
});

export const testApiKeyResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});
