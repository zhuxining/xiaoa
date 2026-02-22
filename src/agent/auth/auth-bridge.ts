/**
 * auth-bridge.ts - 认证桥接
 *
 * 将 xiaoa 的凭据存储桥接到 pi-coding-agent 的 AuthStorage。
 * 使用 AuthStorage.inMemory() 创建内存实例，
 * 通过 setRuntimeApiKey 直接注入 API key。
 */
import { AuthStorage } from "@mariozechner/pi-coding-agent";
import { readConfig } from "@/ipc/config/store";

/**
 * 创建认证桥接
 *
 * 创建一个内存 AuthStorage 实例，
 * 从 xiaoa 的加密凭据中读取 API key 并注入到 storage。
 */
export function createAuthBridge(): AuthStorage {
  const storage = AuthStorage.inMemory();
  const config = readConfig();

  // 如果有配置 API key，直接设置为 runtime API key
  // 这会绕过所有的环境变量和文件读取逻辑
  if (config.llm.apiKey) {
    // 为当前配置的 provider 设置 API key
    storage.setRuntimeApiKey(config.llm.provider, config.llm.apiKey);

    // 也为 model.provider 可能的值设置（例如 deepseek）
    // 因为 model.provider 来自 getModelFromConfig()
    const modelProvider = getModelProvider(config.llm.provider);
    if (modelProvider !== config.llm.provider) {
      storage.setRuntimeApiKey(modelProvider, config.llm.apiKey);
    }
  }

  // 设置 fallback resolver 作为后备
  storage.setFallbackResolver((provider: string) => {
    if (config.llm.apiKey) {
      return config.llm.apiKey;
    }
    return undefined;
  });

  return storage;
}

/**
 * 获取 pi-ai 使用的 provider 名称
 */
function getModelProvider(configProvider: string): string {
  // 配置中的 provider 名称与 model.provider 通常相同
  // 但对于某些自定义 provider 可能需要映射
  return configProvider;
}

/**
 * 获取 xiaoa Agent 目录路径
 *
 * 返回 ~/.xiaoa/agent/，用于存储：
 * - sessions/: 会话 JSONL 文件
 * - skills/: SKILL.md 文件
 */
export function getXiaoaAgentDir(): string {
  // 使用 Electron 的 app.getPath('userData') 获取用户数据目录
  // 在主进程中可用
  const { app } = require("electron");
  const path = require("node:path");
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "agent");
}
