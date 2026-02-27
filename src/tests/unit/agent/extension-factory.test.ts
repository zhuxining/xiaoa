/**
 * extension-factory.test.ts - 小A ExtensionFactory 测试
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  createMockActiveRun,
  createMockExtensionAPI,
} from "../utils/mock-factory";

// Mock dependencies
vi.mock("@/ipc/config/store", () => ({
  readConfig: vi.fn(() => ({
    llm: {
      provider: "anthropic",
      model: "claude-3-5-sonnet",
      apiKey: "test-key",
      endpoint: "",
    },
  })),
}));

vi.mock("@/agent/extension/permission", () => ({
  requestPermission: vi.fn(),
  cancelPendingPermissions: vi.fn(),
}));

vi.mock("@/agent/extension/system-prompt", () => ({
  composeGlobalSystemPrompt: vi.fn(() => "global system prompt"),
  composeWorkspaceSystemPrompt: vi.fn(() => "workspace system prompt"),
}));

vi.mock("@/agent/model", () => ({
  createCustomModel: vi.fn(),
  createOllamaModel: vi.fn(),
  DEEPSEEK_MODELS: [],
}));

vi.mock("@/ipc/chat/schemas", () => ({}));

describe("extension-factory", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("AUTO_ALLOWED_TOOLS", () => {
    test("contains expected tools", async () => {
      // AUTO_ALLOWED_TOOLS is a private constant, we test it indirectly
      // through the tool_call hook behavior
      const { createXiaoaExtension } = await import(
        "@/agent/extension/extension-factory"
      );
      const { requestPermission } = await import(
        "@/agent/extension/permission"
      );
      const run = createMockActiveRun();
      const pi = createMockExtensionAPI();

      const factory = createXiaoaExtension(run);
      factory(pi);

      // Get the tool_call handler
      const onCall = pi.on.mock.calls.find(
        (c: unknown[]) => c[0] === "tool_call"
      );
      const handler = onCall?.[1] as (event: {
        toolName: string;
        input: unknown;
      }) => Promise<unknown>;

      // Auto-allowed tools should not request permission
      const autoAllowedTools = [
        "read",
        "grep",
        "find",
        "ls",
        "memory_search",
        "memory_write",
        "knowledge_read",
        "knowledge_list",
      ];

      for (const toolName of autoAllowedTools) {
        const result = await handler({ toolName, input: {} });
        expect(result).toBeUndefined();
      }

      expect(requestPermission).not.toHaveBeenCalled();
    });
  });

  describe("tool_call hook", () => {
    test("blocks when run is aborted", async () => {
      const { createXiaoaExtension } = await import(
        "@/agent/extension/extension-factory"
      );
      const { cancelPendingPermissions } = await import(
        "@/agent/extension/permission"
      );
      const run = createMockActiveRun({ aborted: true });
      const pi = createMockExtensionAPI();

      const factory = createXiaoaExtension(run);
      factory(pi);

      const onCall = pi.on.mock.calls.find(
        (c: unknown[]) => c[0] === "tool_call"
      );
      const handler = onCall?.[1] as (event: {
        toolName: string;
        input: unknown;
      }) => Promise<unknown>;

      const result = await handler({
        toolName: "bash",
        input: { command: "test" },
      });

      expect(result).toEqual({ block: true, reason: "运行已中止" });
      expect(cancelPendingPermissions).toHaveBeenCalledWith(run.key);
    });

    test("allows tool already in allowedPermissions", async () => {
      const { createXiaoaExtension } = await import(
        "@/agent/extension/extension-factory"
      );
      const { requestPermission } = await import(
        "@/agent/extension/permission"
      );
      const run = createMockActiveRun();
      run.allowedPermissions.add("bash");
      const pi = createMockExtensionAPI();

      const factory = createXiaoaExtension(run);
      factory(pi);

      const onCall = pi.on.mock.calls.find(
        (c: unknown[]) => c[0] === "tool_call"
      );
      const handler = onCall?.[1] as (event: {
        toolName: string;
        input: unknown;
      }) => Promise<unknown>;

      const result = await handler({
        toolName: "bash",
        input: { command: "test" },
      });

      expect(result).toBeUndefined();
      expect(requestPermission).not.toHaveBeenCalled();
    });

    test("requests permission for blocked tool", async () => {
      const { createXiaoaExtension } = await import(
        "@/agent/extension/extension-factory"
      );
      const { requestPermission } = await import(
        "@/agent/extension/permission"
      );
      (requestPermission as ReturnType<typeof vi.fn>).mockResolvedValue({
        decision: "allow",
        alwaysAllow: false,
      });

      const run = createMockActiveRun();
      const pi = createMockExtensionAPI();

      const factory = createXiaoaExtension(run);
      factory(pi);

      const onCall = pi.on.mock.calls.find(
        (c: unknown[]) => c[0] === "tool_call"
      );
      const handler = onCall?.[1] as (event: {
        toolName: string;
        input: unknown;
      }) => Promise<unknown>;

      const result = await handler({
        toolName: "bash",
        input: { command: "ls" },
      });

      expect(requestPermission).toHaveBeenCalledWith(run, "bash", {
        command: "ls",
      });
      expect(result).toBeUndefined();
    });

    test("adds to allowedPermissions when alwaysAllow is true", async () => {
      const { createXiaoaExtension } = await import(
        "@/agent/extension/extension-factory"
      );
      const { requestPermission } = await import(
        "@/agent/extension/permission"
      );
      (requestPermission as ReturnType<typeof vi.fn>).mockResolvedValue({
        decision: "allow",
        alwaysAllow: true,
      });

      const run = createMockActiveRun();
      const pi = createMockExtensionAPI();

      const factory = createXiaoaExtension(run);
      factory(pi);

      const onCall = pi.on.mock.calls.find(
        (c: unknown[]) => c[0] === "tool_call"
      );
      const handler = onCall?.[1] as (event: {
        toolName: string;
        input: unknown;
      }) => Promise<unknown>;

      await handler({ toolName: "bash", input: { command: "ls" } });

      expect(run.allowedPermissions.has("bash")).toBe(true);
    });

    test("blocks when user denies permission", async () => {
      const { createXiaoaExtension } = await import(
        "@/agent/extension/extension-factory"
      );
      const { requestPermission } = await import(
        "@/agent/extension/permission"
      );
      (requestPermission as ReturnType<typeof vi.fn>).mockResolvedValue({
        decision: "deny",
        alwaysAllow: false,
      });

      const run = createMockActiveRun();
      const pi = createMockExtensionAPI();

      const factory = createXiaoaExtension(run);
      factory(pi);

      const onCall = pi.on.mock.calls.find(
        (c: unknown[]) => c[0] === "tool_call"
      );
      const handler = onCall?.[1] as (event: {
        toolName: string;
        input: unknown;
      }) => Promise<unknown>;

      const result = await handler({
        toolName: "bash",
        input: { command: "rm -rf" },
      });

      expect(result).toEqual({ block: true, reason: "操作被用户拒绝" });
    });
  });

  describe("before_agent_start hook", () => {
    test("uses workspace prompt for workspace scope", async () => {
      const { createXiaoaExtension } = await import(
        "@/agent/extension/extension-factory"
      );
      const { composeWorkspaceSystemPrompt } = await import(
        "@/agent/extension/system-prompt"
      );
      const run = createMockActiveRun({
        scope: "workspace",
        workspaceId: "ws-123",
      });
      const pi = createMockExtensionAPI();

      const factory = createXiaoaExtension(run);
      factory(pi);

      const onCall = pi.on.mock.calls.find(
        (c: unknown[]) => c[0] === "before_agent_start"
      );
      const handler = onCall?.[1] as () => Promise<{ systemPrompt: string }>;

      const result = await handler();

      expect(composeWorkspaceSystemPrompt).toHaveBeenCalledWith("ws-123");
      expect(result.systemPrompt).toBe("workspace system prompt");
    });

    test("uses global prompt for global scope", async () => {
      const { createXiaoaExtension } = await import(
        "@/agent/extension/extension-factory"
      );
      const { composeGlobalSystemPrompt } = await import(
        "@/agent/extension/system-prompt"
      );
      const run = createMockActiveRun({ scope: "global" });
      const pi = createMockExtensionAPI();

      const factory = createXiaoaExtension(run);
      factory(pi);

      const onCall = pi.on.mock.calls.find(
        (c: unknown[]) => c[0] === "before_agent_start"
      );
      const handler = onCall?.[1] as () => Promise<{ systemPrompt: string }>;

      const result = await handler();

      expect(composeGlobalSystemPrompt).toHaveBeenCalled();
      expect(result.systemPrompt).toBe("global system prompt");
    });
  });

  describe("registerCustomProviders", () => {
    test("registers deepseek provider when configured", async () => {
      vi.doMock("@/ipc/config/store", () => ({
        readConfig: vi.fn(() => ({
          llm: {
            provider: "deepseek",
            model: "deepseek-chat",
            apiKey: "deepseek-key",
            endpoint: "",
          },
        })),
      }));

      const { createXiaoaExtension } = await import(
        "@/agent/extension/extension-factory"
      );
      const run = createMockActiveRun();
      const pi = createMockExtensionAPI();

      const factory = createXiaoaExtension(run);
      factory(pi);

      expect(pi.registerProvider).toHaveBeenCalledWith(
        "deepseek",
        expect.objectContaining({
          baseUrl: "https://api.deepseek.com/v1",
          api: "openai-completions",
        })
      );
    });

    test("registers ollama provider when configured", async () => {
      vi.doMock("@/ipc/config/store", () => ({
        readConfig: vi.fn(() => ({
          llm: {
            provider: "ollama",
            model: "llama3",
            apiKey: "",
            endpoint: "http://localhost:11434/v1",
          },
        })),
      }));

      const { createXiaoaExtension } = await import(
        "@/agent/extension/extension-factory"
      );
      const run = createMockActiveRun();
      const pi = createMockExtensionAPI();

      const factory = createXiaoaExtension(run);
      factory(pi);

      expect(pi.registerProvider).toHaveBeenCalledWith(
        "ollama",
        expect.objectContaining({
          baseUrl: "http://localhost:11434/v1",
          api: "openai-completions",
        })
      );
    });
  });
});
