import * as fs from "node:fs";
import * as path from "node:path";
import { app } from "electron";
import type { z } from "zod";
import type { globalConfigSchema } from "./schemas";

type GlobalConfig = z.infer<typeof globalConfigSchema>;

// 默认配置
const DEFAULT_CONFIG: GlobalConfig = {
  activeWorkspaceId: null,
  llm: {
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250514",
  },
  preferences: {
    theme: "system",
    language: "zh-CN",
  },
};

// 配置文件路径
function getConfigPath(): string {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "config.json");
}

// 确保配置目录存在
function ensureConfigDir(): void {
  const configPath = getConfigPath();
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

// 读取配置
export function readConfig(): GlobalConfig {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    ensureConfigDir();
    writeConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(content) as GlobalConfig;
    return { ...DEFAULT_CONFIG, ...config };
  } catch {
    // 配置文件损坏时返回默认配置
    return DEFAULT_CONFIG;
  }
}

// 写入配置
export function writeConfig(config: GlobalConfig): void {
  ensureConfigDir();
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

// 更新配置（部分更新）
export function updateConfig(updates: Partial<GlobalConfig>): GlobalConfig {
  const currentConfig = readConfig();
  const newConfig = { ...currentConfig, ...updates };
  writeConfig(newConfig);
  return newConfig;
}
