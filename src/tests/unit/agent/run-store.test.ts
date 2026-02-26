/**
 * run-store.test.ts - 运行时状态管理测试
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Mock run-store 模块以隔离测试
vi.mock("@/ipc/chat/schemas", () => ({}));

describe("run-store", () => {
  // 由于 run-store 使用模块级变量，需要在每个测试前重置模块
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("generateId", () => {
    test("generates unique IDs", async () => {
      const { generateId } = await import("@/agent/run/run-store");
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    test("generates ID with correct format", async () => {
      const { generateId } = await import("@/agent/run/run-store");
      const id = generateId();

      // 格式: timestamp-random
      expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    });
  });

  describe("getSessionKey", () => {
    test("generates key for workspace scope", async () => {
      const { getSessionKey } = await import("@/agent/run/run-store");
      const key = getSessionKey("workspace", "session-123", "ws-456");
      expect(key).toBe("workspace:ws-456:session-123");
    });

    test("generates key for global scope", async () => {
      const { getSessionKey } = await import("@/agent/run/run-store");
      const key = getSessionKey("global", "session-123");
      expect(key).toBe("global::session-123");
    });

    test("handles missing workspaceId in workspace scope", async () => {
      const { getSessionKey } = await import("@/agent/run/run-store");
      const key = getSessionKey("workspace", "session-123");
      expect(key).toBe("workspace::session-123");
    });
  });

  describe("requireWorkspaceId", () => {
    test("throws error for workspace scope without workspaceId", async () => {
      const { requireWorkspaceId } = await import("@/agent/run/run-store");
      expect(() => requireWorkspaceId("workspace")).toThrow(
        "workspace scope requires workspaceId"
      );
    });

    test("returns workspaceId for workspace scope", async () => {
      const { requireWorkspaceId } = await import("@/agent/run/run-store");
      expect(requireWorkspaceId("workspace", "ws-123")).toBe("ws-123");
    });

    test("returns empty string for global scope", async () => {
      const { requireWorkspaceId } = await import("@/agent/run/run-store");
      expect(requireWorkspaceId("global")).toBe("");
    });

    test("returns workspaceId even for global scope if provided", async () => {
      const { requireWorkspaceId } = await import("@/agent/run/run-store");
      expect(requireWorkspaceId("global", "ws-123")).toBe("ws-123");
    });
  });

  describe("appendEvent", () => {
    test("appends event with seq and timestamp", async () => {
      const { appendEvent, eventBuffers } = await import(
        "@/agent/run/run-store"
      );
      const key = "test-key-1";

      const event = appendEvent(key, {
        runId: "run-1",
        scope: "global",
        sessionId: "session-1",
        type: "run_start",
      });

      expect(event.seq).toBeGreaterThan(0);
      expect(event.timestamp).toBeGreaterThan(0);
      expect(eventBuffers.get(key)).toHaveLength(1);
    });

    test("increments seq for each event", async () => {
      const { appendEvent, eventBuffers } = await import(
        "@/agent/run/run-store"
      );
      const key = "test-key-2";

      const event1 = appendEvent(key, {
        runId: "run-1",
        scope: "global",
        sessionId: "session-1",
        type: "run_start",
      });
      const event2 = appendEvent(key, {
        runId: "run-1",
        scope: "global",
        sessionId: "session-1",
        type: "message_delta",
        content: "test",
      });

      expect(event2.seq).toBeGreaterThan(event1.seq);
      expect(eventBuffers.get(key)).toHaveLength(2);
    });

    test("limits buffer size to MAX_EVENTS_PER_SESSION", async () => {
      const { appendEvent, eventBuffers, MAX_EVENTS_PER_SESSION } = await import(
        "@/agent/run/run-store"
      );
      const key = "test-key-3";

      // 添加超过限制的事件
      for (let i = 0; i < MAX_EVENTS_PER_SESSION + 100; i++) {
        appendEvent(key, {
          runId: "run-1",
          scope: "global",
          sessionId: "session-1",
          type: "message_delta",
          content: `message-${i}`,
        });
      }

      const buffer = eventBuffers.get(key);
      expect(buffer).toHaveLength(MAX_EVENTS_PER_SESSION);
      // 验证保留的是最新的事件
      expect(buffer[buffer.length - 1].content).toBe(
        `message-${MAX_EVENTS_PER_SESSION + 99}`
      );
    });
  });

  describe("extractMessageText", () => {
    test("extracts text from string content", async () => {
      const { extractMessageText } = await import("@/agent/run/run-store");
      const result = extractMessageText({ content: "Hello world" });
      expect(result).toBe("Hello world");
    });

    test("extracts text from array content", async () => {
      const { extractMessageText } = await import("@/agent/run/run-store");
      const result = extractMessageText({
        content: [
          { type: "text", text: "Hello " },
          { type: "text", text: "world" },
        ],
      });
      expect(result).toBe("Hello world");
    });

    test("filters non-text parts", async () => {
      const { extractMessageText } = await import("@/agent/run/run-store");
      const result = extractMessageText({
        content: [
          { type: "text", text: "Hello" },
          { type: "image", url: "test.png" },
          { type: "text", text: " world" },
        ],
      });
      expect(result).toBe("Hello world");
    });

    test("returns empty string for null/undefined", async () => {
      const { extractMessageText } = await import("@/agent/run/run-store");
      expect(extractMessageText(null)).toBe("");
      expect(extractMessageText(undefined)).toBe("");
      expect(extractMessageText({})).toBe("");
    });

    test("returns empty string for non-array content", async () => {
      const { extractMessageText } = await import("@/agent/run/run-store");
      expect(extractMessageText({ content: 123 })).toBe("");
      expect(extractMessageText({ content: { nested: true } })).toBe("");
    });
  });

  describe("activeRuns management", () => {
    test("setActiveRun and getActiveRun", async () => {
      const { setActiveRun, getActiveRun, deleteActiveRun, activeRuns } =
        await import("@/agent/run/run-store");
      const key = "test-run-key";
      const run = { runId: "run-1", key } as never;

      setActiveRun(key, run);
      expect(getActiveRun(key)).toBe(run);
      expect(activeRuns.get(key)).toBe(run);

      deleteActiveRun(key);
      expect(getActiveRun(key)).toBeUndefined();
      expect(activeRuns.has(key)).toBe(false);
    });
  });

  describe("eventBuffer management", () => {
    test("getEventBuffer returns empty array for non-existent key", async () => {
      const { getEventBuffer } = await import("@/agent/run/run-store");
      expect(getEventBuffer("non-existent")).toEqual([]);
    });

    test("clearEventBuffer removes buffer", async () => {
      const { appendEvent, getEventBuffer, clearEventBuffer, eventBuffers } =
        await import("@/agent/run/run-store");
      const key = "test-clear-key";

      appendEvent(key, {
        runId: "run-1",
        scope: "global",
        sessionId: "session-1",
        type: "run_start",
      });
      expect(getEventBuffer(key)).toHaveLength(1);

      clearEventBuffer(key);
      expect(eventBuffers.has(key)).toBe(false);
      expect(getEventBuffer(key)).toEqual([]);
    });
  });
});
