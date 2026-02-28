/**
 * chat-actions.test.ts - Chat Actions 测试
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Mock IPC manager
const mockIpc = {
  client: {
    chat: {
      send: vi.fn(),
      abort: vi.fn(),
      events: vi.fn(),
      respondPermission: vi.fn(),
      steer: vi.fn(),
      followUp: vi.fn(),
    },
  },
};

vi.mock("@/ipc/manager", () => ({
  ipc: mockIpc,
}));

describe("Chat Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("sendChat", () => {
    test("calls IPC with correct parameters", async () => {
      const { sendChat } = await import("@/actions/chat");
      mockIpc.client.chat.send.mockResolvedValue({ runId: "run-123" });

      const result = await sendChat({
        content: "Hello",
        scope: "global",
        sessionId: "session-456",
      });

      expect(mockIpc.client.chat.send).toHaveBeenCalledWith({
        content: "Hello",
        scope: "global",
        sessionId: "session-456",
      });
      expect(result).toEqual({ runId: "run-123" });
    });

    test("passes workspace parameters", async () => {
      const { sendChat } = await import("@/actions/chat");
      mockIpc.client.chat.send.mockResolvedValue({ runId: "run-789" });

      await sendChat({
        content: "Workspace message",
        scope: "workspace",
        sessionId: "session-456",
        workspaceId: "ws-123",
        workspaceRootPath: "/path/to/workspace",
        thinkingLevel: "high",
      });

      expect(mockIpc.client.chat.send).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: "workspace",
          workspaceId: "ws-123",
          thinkingLevel: "high",
        })
      );
    });
  });

  describe("abortChat", () => {
    test("calls abort IPC", async () => {
      const { abortChat } = await import("@/actions/chat");
      mockIpc.client.chat.abort.mockResolvedValue({ aborted: true });

      const result = await abortChat({
        scope: "global",
        sessionId: "session-456",
      });

      expect(mockIpc.client.chat.abort).toHaveBeenCalledWith({
        scope: "global",
        sessionId: "session-456",
      });
      expect(result).toEqual({ aborted: true });
    });

    test("passes runId for specific abort", async () => {
      const { abortChat } = await import("@/actions/chat");
      mockIpc.client.chat.abort.mockResolvedValue({ aborted: true });

      await abortChat({
        scope: "global",
        sessionId: "session-456",
        runId: "run-789",
      });

      expect(mockIpc.client.chat.abort).toHaveBeenCalledWith(
        expect.objectContaining({
          runId: "run-789",
        })
      );
    });
  });

  describe("getChatEvents", () => {
    test("fetches events without afterSeq", async () => {
      const { getChatEvents } = await import("@/actions/chat");
      const mockEvents = {
        events: [],
        lastSeq: 0,
        running: false,
        runId: null,
      };
      mockIpc.client.chat.events.mockResolvedValue(mockEvents);

      const result = await getChatEvents({
        scope: "global",
        sessionId: "session-456",
      });

      expect(result).toEqual(mockEvents);
    });

    test("fetches events with afterSeq", async () => {
      const { getChatEvents } = await import("@/actions/chat");
      mockIpc.client.chat.events.mockResolvedValue({
        events: [{ seq: 11, type: "message_delta" }],
        lastSeq: 11,
        running: true,
        runId: "run-123",
      });

      const result = await getChatEvents({
        scope: "global",
        sessionId: "session-456",
        afterSeq: 10,
      });

      expect(mockIpc.client.chat.events).toHaveBeenCalledWith(
        expect.objectContaining({
          afterSeq: 10,
        })
      );
      expect(result.events).toHaveLength(1);
    });
  });

  describe("respondChatPermission", () => {
    test("sends allow decision", async () => {
      const { respondChatPermission } = await import("@/actions/chat");
      mockIpc.client.chat.respondPermission.mockResolvedValue({
        applied: true,
      });

      const result = await respondChatPermission({
        scope: "global",
        sessionId: "session-456",
        runId: "run-789",
        requestId: "req-123",
        decision: "allow",
      });

      expect(result.applied).toBe(true);
    });

    test("sends deny decision with alwaysAllowInSession", async () => {
      const { respondChatPermission } = await import("@/actions/chat");
      mockIpc.client.chat.respondPermission.mockResolvedValue({
        applied: true,
      });

      await respondChatPermission({
        scope: "global",
        sessionId: "session-456",
        runId: "run-789",
        requestId: "req-123",
        decision: "deny",
        alwaysAllowInSession: false,
      });

      expect(mockIpc.client.chat.respondPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          decision: "deny",
          alwaysAllowInSession: false,
        })
      );
    });
  });

  describe("steerChat", () => {
    test("sends steer message", async () => {
      const { steerChat } = await import("@/actions/chat");
      mockIpc.client.chat.steer.mockResolvedValue({ queued: true });

      const result = await steerChat({
        scope: "global",
        sessionId: "session-456",
        message: "Change direction",
      });

      expect(result.queued).toBe(true);
    });
  });

  describe("followUpChat", () => {
    test("sends follow-up message", async () => {
      const { followUpChat } = await import("@/actions/chat");
      mockIpc.client.chat.followUp.mockResolvedValue({ queued: true });

      const result = await followUpChat({
        scope: "global",
        sessionId: "session-456",
        message: "Continue with this",
      });

      expect(result.queued).toBe(true);
    });
  });
});
