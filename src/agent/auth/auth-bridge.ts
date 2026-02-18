/**
 * auth-bridge.ts - 认证桥接
 *
 * 将 xiaoa 的凭据存储桥接到 pi-coding-agent 的 AuthStorage。
 * 使用 AuthStorage.inMemory() 创建内存实例，
 * setFallbackResolver 委托给 readCredentials().providers[provider]。
 */
import { AuthStorage } from "@mariozechner/pi-coding-agent";
import { readConfig } from "@/ipc/config/store";

/**
 * 创建认证桥接
 *
 * 创建一个内存 AuthStorage 实例，
 * 通过 fallback resolver 从 xiaoa 的加密凭据中读取 API key。
 */
export function createAuthBridge(): AuthStorage {
  const storage = AuthStorage.inMemory();

  // 设置 fallback resolver：从 xiaoa 凭据读取 API key
  storage.setFallbackResolver((provider: string) => {
    const config = readConfig();
    // xiaoa 的 provider 配置与 pi-ai 的 provider 映射
    // 例如：config.llm.provider = "anthropic" 对应 provider = "anthropic"
    if (config.llm.provider === provider && config.llm.apiKey) {
      return config.llm.apiKey;
    }
    return undefined;
  });

  return storage;
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
