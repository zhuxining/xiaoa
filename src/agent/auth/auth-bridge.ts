/**
 * auth-bridge.ts - 认证桥接
 *
 * 将 xiaoa 的凭据配置桥接到 pi-coding-agent 的 AuthStorage。
 * 使用 AuthStorage.inMemory() 创建内存实例，通过 setRuntimeApiKey 注入 API key。
 */

import { AuthStorage } from "@mariozechner/pi-coding-agent";
import { readConfig } from "@/ipc/config/store";

/**
 * 创建认证桥接
 *
 * 从 xiaoa 的加密凭据中读取 API key 并注入到 pi AuthStorage。
 */
export function createAuthBridge(): AuthStorage {
  const storage = AuthStorage.inMemory();
  const config = readConfig();

  if (config.llm.apiKey) {
    storage.setRuntimeApiKey(config.llm.provider, config.llm.apiKey);
  }

  storage.setFallbackResolver((_provider: string) => {
    return config.llm.apiKey ?? undefined;
  });

  return storage;
}
