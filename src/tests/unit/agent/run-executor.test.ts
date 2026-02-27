/**
 * run-executor.test.ts - AgentSessionEvent → ChatEvent 桥接测试
 */

import type { AgentSessionEvent } from "@mariozechner/pi-coding-agent";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  createMockActiveRun,
  createMockAgentSession,
} from "../utils/mock-factory";

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

describe("run-executor", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
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
    });

    test("creates run with correct key for workspace scope", async () => {
      const { createActiveRun } = await import("@/agent/run/run-executor");
      const run = createActiveRun({
        scope: "workspace",
        workspaceId: "ws-456",
        sessionId: "session-789",
        content: "Hello workspace",
        workspaceRootPath: "/path/to/workspace",
      });

      expect(run.key).toBe("workspace:ws-456:session-789");
      expect(run.scope).toBe("workspace");
      expect(run.workspaceId).toBe("ws-456");
      expect(run.workspaceRootPath).toBe("/path/to/workspace");
    });

    test("sets default thinkingLevel to minimal", async () => {
      const { createActiveRun } = await import("@/agent/run/run-executor");
      const run = createActiveRun({
        scope: "global",
        sessionId: "session-123",
        content: "Hello",
      });

      expect(run.thinkingLevel).toBe("minimal");
    });

    test("accepts custom thinkingLevel", async () => {
      const { createActiveRun } = await import("@/agent/run/run-executor");
      const run = createActiveRun({
        scope: "global",
        sessionId: "session-123",
        content: "Hello",
        thinkingLevel: "high",
      });

      expect(run.thinkingLevel).toBe("high");
    });
  });

  describe("bridgeEvent", () => {
    test("bridges message_update with text_delta and updates buffer", async () => {
      const { bridgeEvent, setActiveRun } = await import(
        "@/agent/run/run-executor"
      );
      const run = createMockActiveRun({ key: "test-bridge-1" });
      setActiveRun(run.key, run);

      const event = {
        type: "message_update",
        assistantMessageEvent: {
          type: "text_delta",
          contentIndex: 0,
          delta: "Hello ",
          partial: {},
        },
      } as unknown as AgentSessionEvent;

      bridgeEvent(run.key, event);

      expect(run.assistantBuffer).toBe("Hello ");
    });

    test("ignores empty text_delta", async () => {
      const { bridgeEvent, setActiveRun } = await import(
        "@/agent/run/run-executor"
      );
      const run = createMockActiveRun({ key: "test-bridge-2" });
      setActiveRun(run.key, run);

      const event = {
        type: "message_update",
        assistantMessageEvent: {
          type: "text_delta",
          contentIndex: 0,
          delta: "",
          partial: {},
        },
      } as unknown as AgentSessionEvent;

      bridgeEvent(run.key, event);

      expect(run.assistantBuffer).toBe("");
    });

    test("bridges message_end and updates buffer", async () => {
      const { bridgeEvent, setActiveRun } = await import(
        "@/agent/run/run-executor"
      );
      const run = createMockActiveRun({ key: "test-bridge-3" });
      setActiveRun(run.key, run);

      const event = {
        type: "message_end",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "Full response" }],
        },
      } as unknown as AgentSessionEvent;

      bridgeEvent(run.key, event);

      expect(run.assistantBuffer).toBe("Full response");
    });

    test("does not throw for tool_execution_start", async () => {
      const { bridgeEvent, setActiveRun } = await import(
        "@/agent/run/run-executor"
      );
      const run = createMockActiveRun({ key: "test-bridge-4" });
      setActiveRun(run.key, run);

      const event = {
        type: "tool_execution_start",
        toolName: "bash",
        toolCallId: "tc-123",
        args: { command: "test" },
      } as unknown as AgentSessionEvent;

      expect(() => bridgeEvent(run.key, event)).not.toThrow();
    });

    test("does not throw for tool_execution_end", async () => {
      const { bridgeEvent, setActiveRun } = await import(
        "@/agent/run/run-executor"
      );
      const run = createMockActiveRun({ key: "test-bridge-5" });
      setActiveRun(run.key, run);

      const event = {
        type: "tool_execution_end",
        toolName: "bash",
        toolCallId: "tc-123",
        result: "done",
        isError: false,
      } as unknown as AgentSessionEvent;

      expect(() => bridgeEvent(run.key, event)).not.toThrow();
    });

    test("does not throw for auto_compaction events", async () => {
      const { bridgeEvent, setActiveRun } = await import(
        "@/agent/run/run-executor"
      );
      const run = createMockActiveRun({ key: "test-bridge-6" });
      setActiveRun(run.key, run);

      expect(() =>
        bridgeEvent(run.key, {
          type: "auto_compaction_start",
          reason: "threshold",
        } as AgentSessionEvent)
      ).not.toThrow();
      expect(() =>
        bridgeEvent(run.key, {
          type: "auto_compaction_end",
          result: undefined,
          aborted: false,
          willRetry: false,
        } as AgentSessionEvent)
      ).not.toThrow();
    });

    test("does not throw for auto_retry events", async () => {
      const { bridgeEvent, setActiveRun } = await import(
        "@/agent/run/run-executor"
      );
      const run = createMockActiveRun({ key: "test-bridge-7" });
      setActiveRun(run.key, run);

      expect(() =>
        bridgeEvent(run.key, {
          type: "auto_retry_start",
          errorMessage: "Network error",
          attempt: 1,
          maxAttempts: 3,
          delayMs: 1000,
        } as AgentSessionEvent)
      ).not.toThrow();
      expect(() =>
        bridgeEvent(run.key, {
          type: "auto_retry_end",
          success: true,
          attempt: 1,
          finalError: undefined,
        } as AgentSessionEvent)
      ).not.toThrow();
    });

    test("does not throw for turn events", async () => {
      const { bridgeEvent, setActiveRun } = await import(
        "@/agent/run/run-executor"
      );
      const run = createMockActiveRun({ key: "test-bridge-8" });
      setActiveRun(run.key, run);

      expect(() =>
        bridgeEvent(run.key, { type: "turn_start" } as AgentSessionEvent)
      ).not.toThrow();
      expect(() =>
        bridgeEvent(run.key, {
          type: "turn_end",
          message: {} as unknown,
          toolResults: [],
        } as AgentSessionEvent)
      ).not.toThrow();
    });

    test("ignores events when run is aborted", async () => {
      const { bridgeEvent, setActiveRun } = await import(
        "@/agent/run/run-executor"
      );
      const run = createMockActiveRun({ key: "test-bridge-9", aborted: true });
      setActiveRun(run.key, run);

      // Should not throw and should not update buffer
      bridgeEvent(run.key, {
        type: "message_update",
        assistantMessageEvent: {
          type: "text_delta",
          contentIndex: 0,
          delta: "test",
          partial: {},
        },
      } as unknown as AgentSessionEvent);

      expect(run.assistantBuffer).toBe("");
    });

    test("ignores events when run not found", async () => {
      const { bridgeEvent } = await import("@/agent/run/run-executor");

      // Should not throw
      expect(() =>
        bridgeEvent("non-existent-key", {
          type: "message_update",
          assistantMessageEvent: {
            type: "text_delta",
            contentIndex: 0,
            delta: "test",
            partial: {},
          },
        } as unknown as AgentSessionEvent)
      ).not.toThrow();
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
        sessionId: "session-123",
        content: "Hello",
      });

      const run = getActiveRun("global:session-123");
      expect(run).toBeDefined();
      expect(run?.runId).toBe(result.runId);
      expect(run?.content).toBe("Hello");
    });

    test("aborts existing run when starting new one", async () => {
      const { startChatRun, getActiveRun } = await import(
        "@/agent/run/run-executor"
      );
      const mockSession = createMockAgentSession();

      // Start first run
      startChatRun({
        scope: "global",
        sessionId: "session-123",
        content: "First message",
      });

      const firstRun = getActiveRun("global:session-123");
      firstRun!.session = mockSession as never;

      // Start second run - should abort first
      startChatRun({
        scope: "global",
        sessionId: "session-123",
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
        sessionId: "session-123",
        content: "Hello",
      });

      const result = abortChatRun({
        scope: "global",
        sessionId: "session-123",
        runId: "wrong-run-id",
      });

      expect(result.aborted).toBe(false);
    });

    test("aborts run and returns aborted: true", async () => {
      const { startChatRun, abortChatRun, getActiveRun } = await import(
        "@/agent/run/run-executor"
      );
      const mockSession = createMockAgentSession();

      const { runId } = startChatRun({
        scope: "global",
        sessionId: "session-123",
        content: "Hello",
      });

      const run = getActiveRun("global:session-123");
      run!.session = mockSession as never;

      const result = abortChatRun({
        scope: "global",
        sessionId: "session-123",
        runId,
      });

      expect(result.aborted).toBe(true);
      expect(run?.aborted).toBe(true);
      expect(mockSession.abort).toHaveBeenCalled();
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

    test("filters events by afterSeq", async () => {
      const {
        startChatRun,
        getChatEvents,
        bridgeEvent,
        setActiveRun,
        getActiveRun,
      } = await import("@/agent/run/run-executor");

      // Start a run to create event buffer
      startChatRun({
        scope: "global",
        sessionId: "session-filter",
        content: "Hello",
      });

      const run = getActiveRun("global:session-filter");
      if (run) {
        // Add some events
        bridgeEvent(run.key, { type: "turn_start" } as AgentSessionEvent);
        bridgeEvent(run.key, {
          type: "turn_end",
          message: {} as unknown,
          toolResults: [],
        } as AgentSessionEvent);
      }

      // Get all events first
      const allEvents = getChatEvents({
        scope: "global",
        sessionId: "session-filter",
      });

      // Then get events after first seq
      if (allEvents.events.length > 1) {
        const firstSeq = allEvents.events[0].seq;
        const filtered = getChatEvents({
          scope: "global",
          sessionId: "session-filter",
          afterSeq: firstSeq,
        });
        expect(filtered.events.length).toBe(allEvents.events.length - 1);
      }
    });
  });

  describe("respondChatPermission", () => {
    test("returns applied: false when run not found", async () => {
      const { respondChatPermission } = await import(
        "@/agent/run/run-executor"
      );

      const result = respondChatPermission({
        scope: "global",
        sessionId: "non-existent",
        runId: "run-123",
        requestId: "req-123",
        decision: "allow",
      });

      expect(result.applied).toBe(false);
    });

    test("returns applied: false when runId doesn't match", async () => {
      const { startChatRun, respondChatPermission } = await import(
        "@/agent/run/run-executor"
      );

      startChatRun({
        scope: "global",
        sessionId: "session-123",
        content: "Hello",
      });

      const result = respondChatPermission({
        scope: "global",
        sessionId: "session-123",
        runId: "wrong-run-id",
        requestId: "req-123",
        decision: "allow",
      });

      expect(result.applied).toBe(false);
    });
  });

  describe("steerChatRun", () => {
    test("returns queued: false when run not found", async () => {
      const { steerChatRun } = await import("@/agent/run/run-executor");

      const result = steerChatRun({
        scope: "global",
        sessionId: "non-existent",
        message: "steer message",
      });

      expect(result.queued).toBe(false);
    });

    test("returns queued: false when session is null", async () => {
      const { startChatRun, steerChatRun } = await import(
        "@/agent/run/run-executor"
      );

      startChatRun({
        scope: "global",
        sessionId: "session-123",
        content: "Hello",
      });

      const result = steerChatRun({
        scope: "global",
        sessionId: "session-123",
        message: "steer message",
      });

      expect(result.queued).toBe(false);
    });
  });

  describe("followUpChatRun", () => {
    test("returns queued: false when run not found", async () => {
      const { followUpChatRun } = await import("@/agent/run/run-executor");

      const result = followUpChatRun({
        scope: "global",
        sessionId: "non-existent",
        message: "follow up",
      });

      expect(result.queued).toBe(false);
    });
  });
});
