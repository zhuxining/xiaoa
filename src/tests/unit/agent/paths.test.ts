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
    test("returns correct session file path for workspace", async () => {
      const { getSessionFilePath } = await import("@/agent/paths");
      expect(getSessionFilePath("ws-123", "session-456")).toBe(
        join(
          mockUserDataPath,
          "workspaces",
          "ws-123",
          "sessions",
          "session-456.jsonl"
        )
      );
    });

    test("returns correct session file path for global scope", async () => {
      const { getSessionFilePath } = await import("@/agent/paths");
      expect(getSessionFilePath(null, "session-789")).toBe(
        join(mockUserDataPath, "xiaoa", "sessions", "session-789.jsonl")
      );
    });
  });
});
