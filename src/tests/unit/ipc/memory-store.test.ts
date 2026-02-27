/**
 * memory-store.test.ts - 记忆存储测试
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

let userDataPath = "";

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn((name: string) => (name === "userData" ? userDataPath : "")),
  },
}));

describe("memory store", () => {
  beforeEach(() => {
    userDataPath = mkdtempSync(join(tmpdir(), "xiaoa-memory-"));
  });

  afterEach(() => {
    vi.resetModules();
    if (userDataPath && existsSync(userDataPath)) {
      rmSync(userDataPath, { recursive: true, force: true });
    }
  });

  describe("getMemory", () => {
    test("returns default memory when file doesn't exist", async () => {
      const { getMemory } = await import("@/ipc/memory/store");
      const memory = getMemory("ws-123");

      expect(memory.workspaceId).toBe("ws-123");
      expect(memory.content).toContain("长期记忆");
      expect(memory.updatedAt).toBe(0);
    });

    test("returns empty content when file exists but is empty", async () => {
      // Create empty file
      const memoryDir = join(
        userDataPath,
        "workspaces",
        "ws-empty",
        "memories"
      );
      mkdirSync(memoryDir, { recursive: true });
      writeFileSync(join(memoryDir, "MEMORY.md"), "", "utf-8");

      const { getMemory } = await import("@/ipc/memory/store");
      const memory = getMemory("ws-empty");

      // Empty file should return empty content (not default)
      expect(memory.content).toBe("");
      expect(memory.updatedAt).toBeGreaterThan(0);
    });

    test("reads existing memory file", async () => {
      const memoryDir = join(
        userDataPath,
        "workspaces",
        "ws-existing",
        "memories"
      );
      mkdirSync(memoryDir, { recursive: true });
      writeFileSync(
        join(memoryDir, "MEMORY.md"),
        "# Custom Memory\n\nSome content",
        "utf-8"
      );

      const { getMemory } = await import("@/ipc/memory/store");
      const memory = getMemory("ws-existing");

      expect(memory.content).toBe("# Custom Memory\n\nSome content");
      expect(memory.updatedAt).toBeGreaterThan(0);
    });
  });

  describe("saveMemory", () => {
    test("creates memory directory if doesn't exist", async () => {
      const { saveMemory } = await import("@/ipc/memory/store");
      saveMemory("ws-new", "# New Memory");

      const memoryPath = join(
        userDataPath,
        "workspaces",
        "ws-new",
        "memories",
        "MEMORY.md"
      );
      expect(existsSync(memoryPath)).toBe(true);
    });

    test("writes memory content to file", async () => {
      const { saveMemory, getMemory } = await import("@/ipc/memory/store");
      saveMemory("ws-save", "# Updated Memory\n\nNew content");

      const memory = getMemory("ws-save");
      expect(memory.content).toBe("# Updated Memory\n\nNew content");
    });

    test("returns updated memory object", async () => {
      const { saveMemory } = await import("@/ipc/memory/store");
      const memory = saveMemory("ws-return", "# Test");

      expect(memory.workspaceId).toBe("ws-return");
      expect(memory.content).toBe("# Test");
      expect(memory.updatedAt).toBeGreaterThan(0);
    });

    test("overwrites existing memory", async () => {
      const memoryDir = join(
        userDataPath,
        "workspaces",
        "ws-overwrite",
        "memories"
      );
      mkdirSync(memoryDir, { recursive: true });
      writeFileSync(join(memoryDir, "MEMORY.md"), "Old content", "utf-8");

      const { saveMemory, getMemory } = await import("@/ipc/memory/store");
      saveMemory("ws-overwrite", "New content");

      const memory = getMemory("ws-overwrite");
      expect(memory.content).toBe("New content");
    });
  });
});
