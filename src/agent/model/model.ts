/**
 * model.ts - 模型解析
 *
 * 从全局配置解析 pi-ai Model 对象。
 * 原生 provider 通过 pi-ai 的 getModel() 解析。
 * 非原生 provider（deepseek/ollama/custom）通过 ModelRegistry 在 extension 中注册，
 * 此处仅返回占位 Model 供 createAgentSession 初始化使用，
 * 运行时 pi 会从 registry 获取完整定义。
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

/**
 * 从用户配置解析模型
 *
 * 原生 provider 直接用 getModel()；
 * 非原生 provider 返回最小 Model 占位，由 extension registerProvider 补全。
 */
// biome-ignore lint/suspicious/noExplicitAny: pi-ai Model 需要 any
export function getModelFromConfig(): Model<any> {
  const config = readConfig();
  const provider = config.llm.provider;

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

  // 非原生 provider：返回占位 Model，registry 中已有完整定义
  return createPlaceholderModel(
    provider,
    config.llm.model,
    config.llm.endpoint
  );
}

/**
 * 为非原生 provider 创建占位 Model
 *
 * registerProvider 会在 ModelRegistry 中注册完整 model 定义，
 * pi 在实际调用 LLM 时从 registry 查找。
 */
function createPlaceholderModel(
  provider: string,
  modelId: string,
  endpoint?: string
  // biome-ignore lint/suspicious/noExplicitAny: pi-ai Model 需要 any
): Model<any> {
  const baseUrls: Record<string, string> = {
    deepseek: "https://api.deepseek.com/v1",
    ollama: endpoint || "http://localhost:11434/v1",
  };

  return {
    id: modelId,
    name: modelId,
    api: "openai-completions",
    provider,
    baseUrl: baseUrls[provider] ?? endpoint ?? "",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128_000,
    maxTokens: 8000,
    // biome-ignore lint/suspicious/noExplicitAny: 占位 Model
  } as unknown as Model<any>;
}
