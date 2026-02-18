import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { app } from "electron";
import type { z } from "zod";
import type { globalConfigSchema, llmConfigSchema } from "./schemas";

type GlobalConfig = z.infer<typeof globalConfigSchema>;
type Provider = z.infer<typeof llmConfigSchema>["provider"];

interface EncryptedPayload {
  iv: string;
  tag: string;
  data: string;
}

interface CredentialStore {
  providers: Partial<Record<Provider, string>>;
}

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
  return join(userDataPath, "config.json");
}

function getCredentialsPath(): string {
  const userDataPath = app.getPath("userData");
  return join(userDataPath, "credentials.enc");
}

function getCryptoKey(): Buffer {
  const seed = `${app.getName()}::${app.getPath("userData")}`;
  return scryptSync(seed, "xiaoa-credentials", 32);
}

function encryptText(text: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getCryptoKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf-8"),
    cipher.final(),
  ]);
  const payload: EncryptedPayload = {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  };
  return JSON.stringify(payload);
}

function decryptText(input: string): string | null {
  try {
    const payload = JSON.parse(input) as EncryptedPayload;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      getCryptoKey(),
      Buffer.from(payload.iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.data, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf-8");
  } catch {
    return null;
  }
}

// 确保配置目录存在
function ensureConfigDir(): void {
  const configPath = getConfigPath();
  const configDir = dirname(configPath);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
}

function readCredentials(): CredentialStore {
  const path = getCredentialsPath();
  if (!existsSync(path)) {
    return { providers: {} };
  }

  try {
    const encrypted = readFileSync(path, "utf-8");
    const decrypted = decryptText(encrypted);
    if (!decrypted) {
      return { providers: {} };
    }
    return JSON.parse(decrypted) as CredentialStore;
  } catch {
    return { providers: {} };
  }
}

function writeCredentials(store: CredentialStore): void {
  ensureConfigDir();
  const payload = encryptText(JSON.stringify(store));
  writeFileSync(getCredentialsPath(), payload, "utf-8");
}

function saveApiKey(provider: Provider, apiKey: string): void {
  const credentials = readCredentials();
  credentials.providers[provider] = apiKey;
  writeCredentials(credentials);
}

function getApiKey(provider: Provider): string | undefined {
  const credentials = readCredentials();
  return credentials.providers[provider];
}

function sanitizeConfigForDisk(config: GlobalConfig): GlobalConfig {
  return {
    ...config,
    llm: {
      ...config.llm,
      apiKey: undefined,
    },
  };
}

// 读取配置
export function readConfig(): GlobalConfig {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    ensureConfigDir();
    writeConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content) as GlobalConfig;
    const merged = { ...DEFAULT_CONFIG, ...config };
    // One-time migration: move plaintext apiKey from config.json to credentials.enc.
    if (merged.llm.apiKey && !getApiKey(merged.llm.provider)) {
      saveApiKey(merged.llm.provider, merged.llm.apiKey);
      writeConfig(merged);
    }
    return {
      ...merged,
      llm: {
        ...merged.llm,
        apiKey: getApiKey(merged.llm.provider),
      },
    };
  } catch {
    // 配置文件损坏时返回默认配置
    return DEFAULT_CONFIG;
  }
}

// 写入配置
export function writeConfig(config: GlobalConfig): void {
  ensureConfigDir();
  const configPath = getConfigPath();
  const sanitized = sanitizeConfigForDisk(config);
  writeFileSync(configPath, JSON.stringify(sanitized, null, 2), "utf-8");
}

// 更新配置（部分更新）
export function updateConfig(updates: Partial<GlobalConfig>): GlobalConfig {
  const currentConfig = readConfig();
  const llmUpdates: Partial<GlobalConfig["llm"]> = updates.llm ?? {};
  const newConfig: GlobalConfig = {
    ...currentConfig,
    ...updates,
    llm: {
      ...currentConfig.llm,
      ...llmUpdates,
    },
  };

  if (llmUpdates.apiKey) {
    saveApiKey(newConfig.llm.provider, llmUpdates.apiKey);
  }

  writeConfig(newConfig);
  return newConfig;
}
