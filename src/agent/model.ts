/**
 * model.ts - 模型解析
 *
 * 从全局配置解析 pi-ai Model 对象。
 * 支持 anthropic / openai / deepseek / ollama / custom 等 provider。
 */

import type { Model } from "@mariozechner/pi-ai";
import { getModel } from "@mariozechner/pi-ai";
import { readConfig } from "@/ipc/config/store";

type GetModelArgs = Parameters<typeof getModel>;

// pi-ai 原生支持的 provider
const PI_AI_NATIVE_PROVIDERS = [
  "anthropic",
  "openai",
  "azure-openai-responses",
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
] as const;

type PiAiProvider = (typeof PI_AI_NATIVE_PROVIDERS)[number];

function isPiAiNativeProvider(provider: string): provider is PiAiProvider {
  return PI_AI_NATIVE_PROVIDERS.includes(provider as PiAiProvider);
}

const DEEPSEEK_MODELS: Record<string, { name: string; reasoning: boolean }> = {
  "deepseek-chat": { name: "DeepSeek Chat (V3)", reasoning: false },
  "deepseek-reasoner": { name: "DeepSeek Reasoner (R1)", reasoning: true },
};

/**
 * 从用户配置解析模型
 */
// biome-ignore lint/suspicious/noExplicitAny: pi-ai Model 需要 any
export function getModelFromConfig(): Model<any> {
  const config = readConfig();
  const provider = config.llm.provider;

  if (provider === "deepseek") {
    const meta = DEEPSEEK_MODELS[config.llm.model] ?? {
      name: config.llm.model,
      reasoning: false,
    };
    return {
      id: config.llm.model,
      name: meta.name,
      api: "openai-completions",
      provider: "deepseek",
      baseUrl: "https://api.deepseek.com/v1",
      reasoning: meta.reasoning,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 64_000,
      maxTokens: 8000,
      // biome-ignore lint/suspicious/noExplicitAny: 自定义 provider 构造
    } as unknown as Model<any>;
  }

  if (provider === "ollama") {
    return {
      id: config.llm.model,
      name: config.llm.model,
      api: "openai-completions",
      provider: "ollama",
      baseUrl: config.llm.endpoint || "http://localhost:11434/v1",
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128_000,
      maxTokens: 4096,
      // biome-ignore lint/suspicious/noExplicitAny: 自定义 provider 构造
    } as unknown as Model<any>;
  }

  if (provider === "custom") {
    if (!config.llm.endpoint) {
      throw new Error("custom provider 需要配置 endpoint");
    }
    return {
      id: config.llm.model,
      name: config.llm.model,
      api: "openai-completions",
      provider: "custom",
      baseUrl: config.llm.endpoint,
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128_000,
      maxTokens: 4096,
      // biome-ignore lint/suspicious/noExplicitAny: 自定义 provider 构造
    } as unknown as Model<any>;
  }

  if (isPiAiNativeProvider(provider)) {
    const model = getModel(
      provider as GetModelArgs[0],
      config.llm.model as unknown as GetModelArgs[1]
    );
    if (!model) {
      throw new Error(
        `模型 "${config.llm.model}" 在 ${provider} 中不存在，请在设置中选择有效的模型`
      );
    }
    return model;
  }

  throw new Error(`不支持的 provider: ${provider}`);
}
