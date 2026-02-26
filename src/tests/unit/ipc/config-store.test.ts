/**
 * config-store.test.ts - 配置存储测试
 */

import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

let userDataPath = "";
let appName = "xiaoa";

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn((name: string) => (name === "userData" ? userDataPath : "")),
    getName: vi.fn(() => appName),
  },
}));

describe("config store", () => {
  beforeEach(() => {
    userDataPath = mkdtempSync(join(tmpdir(), "xiaoa-config-"));
  });

  afterEach(() => {
    vi.resetModules();
    if (userDataPath && existsSync(userDataPath)) {
    rmSync(userDataPath, { recursive: true, force: true });
    }
  });

  describe("readConfig", () => {
    test("returns default config when file doesn't exist", async () => {
      const { readConfig } = await import("@/ipc/config/store");
      const config = readConfig();

      expect(config.activeWorkspaceId).toBeNull();
      expect(config.llm.provider).toBe("anthropic");
      expect(config.preferences.theme).toBe("system");
    });

    test("creates config file when it doesn't exist", async () => {
      const { readConfig } = await import("@/ipc/config/store");
      readConfig();

      expect(existsSync(join(userDataPath, "config.json"))).toBe(true);
    });

    test("reads existing config", async () => {
      const existingConfig = {
        activeWorkspaceId: "ws-123",
        llm: { provider: "deepseek", model: "deepseek-chat" },
        preferences: { theme: "dark", language: "en-US" },
      };
      writeFileSync(
        join(userDataPath, "config.json"),
        JSON.stringify(existingConfig),
        "utf-8"
      );

      const { readConfig } = await import("@/ipc/config/store");
      const config = readConfig();

      expect(config.activeWorkspaceId).toBe("ws-123");
      expect(config.llm.provider).toBe("deepseek");
      expect(config.preferences.theme).toBe("dark");
    });

    test("returns default config on corrupted file", async () => {
      writeFileSync(join(userDataPath, "config.json"), "not valid json", "utf-8");

      const { readConfig } = await import("@/ipc/config/store");
      const config = readConfig();

      expect(config.activeWorkspaceId).toBeNull();
      expect(config.llm.provider).toBe("anthropic");
    });
  });

  describe("writeConfig", () => {
    test("writes config to file", async () => {
      const { writeConfig, readConfig } = await import("@/ipc/config/store");

      writeConfig({
        activeWorkspaceId: "ws-456",
        llm: { provider: "anthropic", model: "claude-3-5-sonnet" },
        preferences: { theme: "light", language: "zh-CN" },
      });

      const config = readConfig();
      expect(config.activeWorkspaceId).toBe("ws-456");
      expect(config.preferences.theme).toBe("light");
    });

    test("sanitizes apiKey from config file", async () => {
      const { writeConfig } = await import("@/ipc/config/store");

      writeConfig({
        activeWorkspaceId: null,
        llm: {
          provider: "anthropic",
          model: "claude-3-5-sonnet",
          apiKey: "secret-key",
        },
        preferences: { theme: "system", language: "zh-CN" },
      });

      const content = readFileSync(join(userDataPath, "config.json"), "utf-8");
      const saved = JSON.parse(content);
      expect(saved.llm.apiKey).toBeUndefined();
    });
  });

  describe("updateConfig", () => {
    test("merges partial updates", async () => {
      const { updateConfig, readConfig } = await import("@/ipc/config/store");

      // First write initial config
      updateConfig({
        preferences: { theme: "dark", language: "zh-CN" },
      });

      // Then update with full preferences (partial merge at top level)
      updateConfig({
        preferences: { theme: "light", language: "zh-CN" },
      });

      const config = readConfig();
      expect(config.preferences.theme).toBe("light");
      expect(config.preferences.language).toBe("zh-CN");
    });

    test("stores apiKey in credentials file", async () => {
      const { updateConfig } = await import("@/ipc/config/store");

      updateConfig({
        llm: { provider: "anthropic", model: "claude-3-5-sonnet", apiKey: "test-key" },
      });

      // credentials.enc should exist
      expect(existsSync(join(userDataPath, "credentials.enc"))).toBe(true);
    });
  });

  describe("API key encryption", () => {
    test("encrypts and decrypts API keys", async () => {
      const { updateConfig, readConfig } = await import("@/ipc/config/store");

      updateConfig({
        llm: {
          provider: "anthropic",
          model: "claude-3-5-sonnet",
          apiKey: "my-secret-api-key",
        },
      });

      // Reset module to read fresh
      vi.resetModules();
      const { readConfig: readConfigFresh } = await import("@/ipc/config/store");

      const config = readConfigFresh();
      expect(config.llm.apiKey).toBe("my-secret-api-key");
    });

    test("handles different providers", async () => {
      const { updateConfig, readConfig } = await import("@/ipc/config/store");

      // Set anthropic key
      updateConfig({
        llm: { provider: "anthropic", model: "claude-3-5-sonnet", apiKey: "anthropic-key" },
      });

      // Switch to deepseek
      updateConfig({
        llm: { provider: "deepseek", model: "deepseek-chat", apiKey: "deepseek-key" },
      });

      vi.resetModules();
      const { readConfig: readConfigFresh } = await import("@/ipc/config/store");

      const config = readConfigFresh();
      expect(config.llm.provider).toBe("deepseek");
      expect(config.llm.apiKey).toBe("deepseek-key");
    });

    test("migrates plaintext apiKey to credentials", async () => {
      // Create config with plaintext apiKey (old format)
      const oldConfig = {
        activeWorkspaceId: null,
        llm: {
          provider: "anthropic",
          model: "claude-3-5-sonnet",
          apiKey: "plaintext-key",
        },
        preferences: { theme: "system", language: "zh-CN" },
      };
      writeFileSync(
        join(userDataPath, "config.json"),
        JSON.stringify(oldConfig),
        "utf-8"
      );

      const { readConfig } = await import("@/ipc/config/store");
      const config = readConfig();

      // API key should be migrated to credentials
      expect(config.llm.apiKey).toBe("plaintext-key");
      expect(existsSync(join(userDataPath, "credentials.enc"))).toBe(true);

      // Config file should no longer have apiKey
      const savedConfig = JSON.parse(
        readFileSync(join(userDataPath, "config.json"), "utf-8")
      );
      expect(savedConfig.llm.apiKey).toBeUndefined();
    });
  });
});
