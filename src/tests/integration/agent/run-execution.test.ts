/**
 * run-execution.test.ts - Run 执行流程集成测试
 */

import type { AgentSessionEvent } from "@mariozechner/pi-coding-agent";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  cleanupTempDir,
  createMockXiaoaDataDir,
  createTempDir,
} from "../utils/fs-helpers";

// Mock dependencies
vi.mock("@/agent/session", () => ({
  createGlobalSession: vi.fn(),
  createWorkspaceSession: vi.fn(),
  disposeSession: vi.fn(),
  getOrCreateSession: vi.fn(),
  getPooledSession: vi.fn(),
  releaseSession: vi.fn(),
}));

vi.mock("@/agent/extension", () => ({
  cancelPendingPermissions: vi.fn(),
  respondToPermission: vi.fn(),
}));

vi.mock("@/ipc/chat/schemas", () => ({}));

describe("Run Execution Integration", () => {
  let tempDir: string;

  beforeEach(async () => {
    vi.resetModules();
    tempDir = createTempDir("run-execution");
    createMockXiaoaDataDir(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
    vi.restoreAllMocks();
  });

  describe("createActiveRun", () => {
    test("creates run with correct key for global scope", async () => {
      const { createActiveRun } = await import("@/agent/run/run-executor");

      const run = createActiveRun({
        scope: "global",
        sessionId: "session-123",
        content: "Hello",
      });

      expect(run.key).toBe("global:session-123");
      expect(run.scope).toBe("global");
      expect(run.workspaceId).toBeNull();
      expect(run.sessionId).toBe("session-123");
      expect(run.content).toBe("Hello");
      expect(run.aborted).toBe(false);
      expect(run.isResumed).toBe(false);
      expect(run.assistantBuffer).toBe("");
      expect(run.allowedPermissions).toBeInstanceOf(Set);
      expect(run.thinkingLevel).toBe("minimal");
    });

    test("creates run with correct key for workspace scope", async () => {
      const { createActiveRun } = await import("@/agent/run/run-executor");

      const run = createActiveRun({
        scope: "workspace",
        workspaceId: "ws-456",
        sessionId: "session-789",
        content: "Workspace message",
        workspaceRootPath: "/path/to/workspace",
        thinkingLevel: "high",
      });

      expect(run.key).toBe("workspace:ws-456:session-789");
      expect(run.scope).toBe("workspace");
      expect(run.workspaceId).toBe("ws-456");
      expect(run.workspaceRootPath).toBe("/path/to/workspace");
      expect(run.thinkingLevel).toBe("high");
    });
  });

  describe("startChatRun", () => {
    test("throws error for empty content", async () => {
      const { startChatRun } = await import("@/agent/run/run-executor");

      expect(() =>
        startChatRun({
          scope: "global",
          sessionId: "session-123",
          content: "   ",
        })
      ).toThrow("content is required");
    });

    test("creates and stores ActiveRun", async () => {
      const { startChatRun, getActiveRun } = await import(
        "@/agent/run/run-executor"
      );

      const result = startChatRun({
        scope: "global",
        sessionId: "session-start-test",
        content: "Hello",
      });

      const run = getActiveRun("global:session-start-test");
      expect(run).toBeDefined();
      expect(run?.runId).toBe(result.runId);
      expect(run?.content).toBe("Hello");
    });

    test("aborts existing run when starting new one", async () => {
      const { startChatRun, getActiveRun } = await import(
        "@/agent/run/run-executor"
      );

      // Start first run
      startChatRun({
        scope: "global",
        sessionId: "session-abort-test",
        content: "First message",
      });

      const firstRun = getActiveRun("global:session-abort-test");

      // Start second run - should abort first
      startChatRun({
        scope: "global",
        sessionId: "session-abort-test",
        content: "Second message",
      });

      expect(firstRun?.aborted).toBe(true);
    });
  });

  describe("abortChatRun", () => {
    test("returns aborted: false when run not found", async () => {
      const { abortChatRun } = await import("@/agent/run/run-executor");

      const result = abortChatRun({
        scope: "global",
        sessionId: "non-existent",
      });

      expect(result.aborted).toBe(false);
    });

    test("returns aborted: false when runId doesn't match", async () => {
      const { startChatRun, abortChatRun } = await import(
        "@/agent/run/run-executor"
      );

      startChatRun({
        scope: "global",
        sessionId: "session-runid-test",
        content: "Hello",
      });

      const result = abortChatRun({
        scope: "global",
        sessionId: "session-runid-test",
        runId: "wrong-run-id",
      });

      expect(result.aborted).toBe(false);
    });
  });

  describe("getChatEvents", () => {
    test("returns empty events for non-existent key", async () => {
      const { getChatEvents } = await import("@/agent/run/run-executor");

      const result = getChatEvents({
        scope: "global",
        sessionId: "non-existent",
      });

      expect(result.events).toEqual([]);
      expect(result.lastSeq).toBe(0);
      expect(result.running).toBe(false);
      expect(result.runId).toBeNull();
    });

    test("returns events after starting run", async () => {
      const { startChatRun, getChatEvents } = await import(
        "@/agent/run/run-executor"
      );

      startChatRun({
        scope: "global",
        sessionId: "session-events-test",
        content: "Hello",
      });

      const result = getChatEvents({
        scope: "global",
        sessionId: "session-events-test",
      });

      // Should have at least run_start event
      expect(result.events.length).toBeGreaterThan(0);
      expect(result.running).toBe(true);
      expect(result.runId).not.toBeNull();
    });
  });

  describe("bridgeEvent", () => {
    test("bridges message_update with text_delta", async () => {
      const { bridgeEvent, startChatRun, getActiveRun } = await import(
        "@/agent/run/run-executor"
      );

      startChatRun({
        scope: "global",
        sessionId: "session-bridge-test",
        content: "Hello",
      });

      const run = getActiveRun("global:session-bridge-test");

      bridgeEvent(run!.key, {
        type: "message_update",
        assistantMessageEvent: {
          type: "text_delta",
          contentIndex: 0,
          delta: "Hello ",
          partial: {},
        },
      } as unknown as AgentSessionEvent);

      expect(run?.assistantBuffer).toBe("Hello ");
    });

    test("ignores events when run is aborted", async () => {
      const { bridgeEvent, startChatRun, getActiveRun } = await import(
        "@/agent/run/run-executor"
      );

      startChatRun({
        scope: "global",
        sessionId: "session-aborted-bridge",
        content: "Hello",
      });

      const run = getActiveRun("global:session-aborted-bridge");
      run!.aborted = true;

      bridgeEvent(run!.key, {
        type: "message_update",
        assistantMessageEvent: {
          type: "text_delta",
          contentIndex: 0,
          delta: "test",
          partial: {},
        },
      } as unknown as AgentSessionEvent);

      // Buffer should not be updated
      expect(run?.assistantBuffer).toBe("");
    });
  });
});
