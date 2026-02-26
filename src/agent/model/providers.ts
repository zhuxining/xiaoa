/**
 * providers.ts - 非原生 Provider 模型定义
 *
 * 集中定义 deepseek / ollama / custom 等非 pi-ai 原生 provider 的模型列表，
 * 供 extension-factory.ts 的 registerProvider 使用。
 */

import type { ProviderModelConfig } from "@mariozechner/pi-coding-agent";

/** DeepSeek 模型列表 */
export const DEEPSEEK_MODELS: ProviderModelConfig[] = [
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat (V3)",
    reasoning: false,
    input: ["text"],
    cost: { input: 0.27, output: 1.1, cacheRead: 0.07, cacheWrite: 0.27 },
    contextWindow: 64_000,
    maxTokens: 8000,
  },
  {
    id: "deepseek-reasoner",
    name: "DeepSeek Reasoner (R1)",
    reasoning: true,
    input: ["text"],
    cost: { input: 0.55, output: 2.19, cacheRead: 0.14, cacheWrite: 0.55 },
    contextWindow: 64_000,
    maxTokens: 8000,
  },
];

/**
 * 为 Ollama 创建模型配置
 * Ollama 模型是动态的，仅为用户配置的模型创建一个条目。
 */
export function createOllamaModel(modelId: string): ProviderModelConfig {
  return {
    id: modelId,
    name: modelId,
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128_000,
    maxTokens: 4096,
  };
}

/**
 * 为 Custom provider 创建模型配置
 */
export function createCustomModel(modelId: string): ProviderModelConfig {
  return {
    id: modelId,
    name: modelId,
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128_000,
    maxTokens: 4096,
  };
}
