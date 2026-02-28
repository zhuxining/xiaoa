/**
 * chat-schemas.test.ts - Chat IPC Schema 验证测试
 */

import { describe, expect, test } from "vitest";
import {
  chatAbortInputSchema,
  chatFollowUpInputSchema,
  chatGetEventsInputSchema,
  chatRespondPermissionInputSchema,
  chatScopeSchema,
  chatSendInputSchema,
  chatSetActiveToolsInputSchema,
  chatSteerInputSchema,
  permissionRiskSchema,
  permissionTypeSchema,
  thinkingLevelSchema,
} from "@/ipc/chat/schemas";

describe("chat-schemas", () => {
  describe("chatScopeSchema", () => {
    test("accepts valid scopes", () => {
      expect(chatScopeSchema.parse("global")).toBe("global");
      expect(chatScopeSchema.parse("workspace")).toBe("workspace");
    });

    test("rejects invalid scope", () => {
      expect(() => chatScopeSchema.parse("invalid")).toThrow();
    });
  });

  describe("thinkingLevelSchema", () => {
    test("accepts valid thinking levels", () => {
      const validLevels = ["off", "minimal", "low", "medium", "high", "xhigh"];
      for (const level of validLevels) {
        expect(thinkingLevelSchema.parse(level)).toBe(level);
      }
    });

    test("rejects invalid thinking level", () => {
      expect(() => thinkingLevelSchema.parse("extreme")).toThrow();
    });
  });

  describe("permissionTypeSchema", () => {
    test("accepts valid permission types", () => {
      const validTypes = ["file_read", "file_write", "execute", "network"];
      for (const type of validTypes) {
        expect(permissionTypeSchema.parse(type)).toBe(type);
      }
    });

    test("rejects invalid permission type", () => {
      expect(() => permissionTypeSchema.parse("admin")).toThrow();
    });
  });

  describe("permissionRiskSchema", () => {
    test("accepts valid risk levels", () => {
      expect(permissionRiskSchema.parse("low")).toBe("low");
      expect(permissionRiskSchema.parse("medium")).toBe("medium");
      expect(permissionRiskSchema.parse("high")).toBe("high");
    });

    test("rejects invalid risk level", () => {
      expect(() => permissionRiskSchema.parse("critical")).toThrow();
    });
  });

  describe("chatSendInputSchema", () => {
    test("validates global scope input", () => {
      const result = chatSendInputSchema.parse({
        scope: "global",
        sessionId: "session-123",
        content: "Hello",
      });
      expect(result.scope).toBe("global");
      expect(result.sessionId).toBe("session-123");
      expect(result.content).toBe("Hello");
    });

    test("validates workspace scope input", () => {
      const result = chatSendInputSchema.parse({
        scope: "workspace",
        workspaceId: "ws-456",
        sessionId: "session-789",
        content: "Workspace message",
        workspaceRootPath: "/path/to/workspace",
        thinkingLevel: "high",
      });
      expect(result.scope).toBe("workspace");
      expect(result.workspaceId).toBe("ws-456");
      expect(result.thinkingLevel).toBe("high");
    });

    test("rejects empty content", () => {
      expect(() =>
        chatSendInputSchema.parse({
          scope: "global",
          sessionId: "session-123",
          content: "",
        })
      ).toThrow();
    });

    test("accepts whitespace content (Zod .min(1) allows whitespace)", () => {
      // Note: Zod's .min(1) only checks length, not trimmed content
      const result = chatSendInputSchema.parse({
        scope: "global",
        sessionId: "session-123",
        content: "   ",
      });
      expect(result.content).toBe("   ");
    });

    test("rejects missing sessionId", () => {
      expect(() =>
        chatSendInputSchema.parse({
          scope: "global",
          content: "Hello",
        })
      ).toThrow();
    });
  });

  describe("chatAbortInputSchema", () => {
    test("validates abort input without runId", () => {
      const result = chatAbortInputSchema.parse({
        scope: "global",
        sessionId: "session-123",
      });
      expect(result.runId).toBeUndefined();
    });

    test("validates abort input with runId", () => {
      const result = chatAbortInputSchema.parse({
        scope: "global",
        sessionId: "session-123",
        runId: "run-456",
      });
      expect(result.runId).toBe("run-456");
    });

    test("validates workspace scope abort", () => {
      const result = chatAbortInputSchema.parse({
        scope: "workspace",
        workspaceId: "ws-789",
        sessionId: "session-123",
      });
      expect(result.workspaceId).toBe("ws-789");
    });
  });

  describe("chatGetEventsInputSchema", () => {
    test("validates without afterSeq", () => {
      const result = chatGetEventsInputSchema.parse({
        scope: "global",
        sessionId: "session-123",
      });
      expect(result.afterSeq).toBeUndefined();
    });

    test("validates with afterSeq", () => {
      const result = chatGetEventsInputSchema.parse({
        scope: "global",
        sessionId: "session-123",
        afterSeq: 10,
      });
      expect(result.afterSeq).toBe(10);
    });

    test("rejects negative afterSeq", () => {
      expect(() =>
        chatGetEventsInputSchema.parse({
          scope: "global",
          sessionId: "session-123",
          afterSeq: -1,
        })
      ).toThrow();
    });
  });

  describe("chatRespondPermissionInputSchema", () => {
    test("validates allow decision", () => {
      const result = chatRespondPermissionInputSchema.parse({
        scope: "global",
        sessionId: "session-123",
        runId: "run-456",
        requestId: "req-789",
        decision: "allow",
      });
      expect(result.decision).toBe("allow");
    });

    test("validates deny decision", () => {
      const result = chatRespondPermissionInputSchema.parse({
        scope: "global",
        sessionId: "session-123",
        runId: "run-456",
        requestId: "req-789",
        decision: "deny",
      });
      expect(result.decision).toBe("deny");
    });

    test("validates with alwaysAllowInSession", () => {
      const result = chatRespondPermissionInputSchema.parse({
        scope: "global",
        sessionId: "session-123",
        runId: "run-456",
        requestId: "req-789",
        decision: "allow",
        alwaysAllowInSession: true,
      });
      expect(result.alwaysAllowInSession).toBe(true);
    });

    test("rejects invalid decision", () => {
      expect(() =>
        chatRespondPermissionInputSchema.parse({
          scope: "global",
          sessionId: "session-123",
          runId: "run-456",
          requestId: "req-789",
          decision: "maybe",
        })
      ).toThrow();
    });
  });

  describe("chatSteerInputSchema", () => {
    test("validates steer input", () => {
      const result = chatSteerInputSchema.parse({
        scope: "global",
        sessionId: "session-123",
        message: "Change direction",
      });
      expect(result.message).toBe("Change direction");
    });

    test("rejects empty message", () => {
      expect(() =>
        chatSteerInputSchema.parse({
          scope: "global",
          sessionId: "session-123",
          message: "",
        })
      ).toThrow();
    });
  });

  describe("chatFollowUpInputSchema", () => {
    test("validates follow-up input", () => {
      const result = chatFollowUpInputSchema.parse({
        scope: "global",
        sessionId: "session-123",
        message: "Continue with this",
      });
      expect(result.message).toBe("Continue with this");
    });

    test("rejects empty message", () => {
      expect(() =>
        chatFollowUpInputSchema.parse({
          scope: "global",
          sessionId: "session-123",
          message: "",
        })
      ).toThrow();
    });
  });

  describe("chatSetActiveToolsInputSchema", () => {
    test("validates tool names array", () => {
      const result = chatSetActiveToolsInputSchema.parse({
        scope: "global",
        sessionId: "session-123",
        toolNames: ["read", "write", "bash"],
      });
      expect(result.toolNames).toHaveLength(3);
    });

    test("validates empty array", () => {
      const result = chatSetActiveToolsInputSchema.parse({
        scope: "global",
        sessionId: "session-123",
        toolNames: [],
      });
      expect(result.toolNames).toHaveLength(0);
    });
  });
});
