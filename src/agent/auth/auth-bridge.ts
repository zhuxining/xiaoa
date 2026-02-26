/**
 * auth-bridge.ts - 认证桥接
 *
 * 将 xiaoa 的凭据配置桥接到 pi-coding-agent 的 AuthStorage。
 * 使用 AuthStorage.inMemory() 创建内存实例，通过 setRuntimeApiKey 注入 API key。
 *
 * 支持多 provider API key 注入，fallbackResolver 按 provider 分发。
 */

import { AuthStorage } from "@mariozechner/pi-coding-agent";
import { readConfig } from "@/ipc/config/store";

/**
 * 创建认证桥接
 *
 * 从 xiaoa 的配置中读取 API key 并注入到 pi AuthStorage。
 * 为当前配置的 provider 设置 runtime API key，
 * fallback resolver 按 provider 分发（而非所有 provider 返回同一个 key）。
 */
export function createAuthBridge(): AuthStorage {
  const storage = AuthStorage.inMemory();
  const config = readConfig();

  // 为当前 provider 注入 API key
  if (config.llm.apiKey) {
    storage.setRuntimeApiKey(config.llm.provider, config.llm.apiKey);
  }

  // 按 provider 分发 API key
  const providerKeyMap = new Map<string, string>();
  if (config.llm.apiKey) {
    providerKeyMap.set(config.llm.provider, config.llm.apiKey);
  }

  storage.setFallbackResolver((provider: string) => {
    return providerKeyMap.get(provider);
  });

  return storage;
}
