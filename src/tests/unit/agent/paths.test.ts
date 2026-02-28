/**
 * paths.test.ts - 路径计算函数测试
 */

import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { setMockUserDataPath } from "../__mocks__/electron";

let mockUserDataPath = "";

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn((name: string) =>
      name === "userData" ? mockUserDataPath : ""
    ),
  },
}));

// Mock pi-coding-agent SessionManager
vi.mock("@mariozechner/pi-coding-agent", () => ({
  SessionManager: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

describe("paths", () => {
  beforeEach(() => {
    mockUserDataPath = "/test/user-data";
    setMockUserDataPath(mockUserDataPath);
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("getWorkspaceDir", () => {
    test("returns correct workspace directory path", async () => {
      const { getWorkspaceDir } = await import("@/agent/paths");
      expect(getWorkspaceDir("ws-123")).toBe(
        join(mockUserDataPath, "workspaces", "ws-123")
      );
    });

    test("handles different workspace IDs", async () => {
      const { getWorkspaceDir } = await import("@/agent/paths");
      expect(getWorkspaceDir("abc")).toBe(
        join(mockUserDataPath, "workspaces", "abc")
      );
      expect(getWorkspaceDir("workspace-with-dashes")).toBe(
        join(mockUserDataPath, "workspaces", "workspace-with-dashes")
      );
    });
  });

  describe("getGlobalDir", () => {
    test("returns correct global directory path", async () => {
      const { getGlobalDir } = await import("@/agent/paths");
      expect(getGlobalDir()).toBe(join(mockUserDataPath, "xiaoa"));
    });
  });

  describe("getBaseDir", () => {
    test("returns workspace dir when workspaceId is provided", async () => {
      const { getBaseDir } = await import("@/agent/paths");
      expect(getBaseDir("ws-123")).toBe(
        join(mockUserDataPath, "workspaces", "ws-123")
      );
    });

    test("returns global dir when workspaceId is null", async () => {
      const { getBaseDir } = await import("@/agent/paths");
      expect(getBaseDir(null)).toBe(join(mockUserDataPath, "xiaoa"));
    });
  });

  describe("getSessionsDir", () => {
    test("returns sessions dir for workspace", async () => {
      const { getSessionsDir } = await import("@/agent/paths");
      expect(getSessionsDir("ws-123")).toBe(
        join(mockUserDataPath, "workspaces", "ws-123", "sessions")
      );
    });

    test("returns sessions dir for global scope", async () => {
      const { getSessionsDir } = await import("@/agent/paths");
      expect(getSessionsDir(null)).toBe(
        join(mockUserDataPath, "xiaoa", "sessions")
      );
    });
  });

  describe("getSessionFilePath", () => {
    test("returns new session file path for workspace when session not found", async () => {
      const { getSessionFilePath } = await import("@/agent/paths");
      const result = await getSessionFilePath("ws-123", "session-456");
      // 应该包含时间戳和 session ID
      expect(result).toContain(
        join(mockUserDataPath, "workspaces", "ws-123", "sessions")
      );
      expect(result).toContain("session-456");
      expect(result).toMatch(/\d+_session-456\.jsonl$/);
    });

    test("returns new session file path for global scope when session not found", async () => {
      const { getSessionFilePath } = await import("@/agent/paths");
      const result = await getSessionFilePath(null, "session-789");
      expect(result).toContain(join(mockUserDataPath, "xiaoa", "sessions"));
      expect(result).toContain("session-789");
      expect(result).toMatch(/\d+_session-789\.jsonl$/);
    });
  });
});
