/**
 * workspace-store.test.ts - 工作区 CRUD 测试
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
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

describe("workspace store", () => {
  beforeEach(() => {
    userDataPath = mkdtempSync(join(tmpdir(), "xiaoa-workspace-"));
  });

  afterEach(() => {
    vi.resetModules();
    if (userDataPath && existsSync(userDataPath)) {
      rmSync(userDataPath, { recursive: true, force: true });
    }
  });

  describe("listWorkspaces", () => {
    test("returns empty array when no workspaces exist", async () => {
      const { listWorkspaces } = await import("@/ipc/workspace/store");
      expect(listWorkspaces()).toEqual([]);
    });

    test("returns list of workspaces", async () => {
      const { createWorkspace, listWorkspaces } = await import(
        "@/ipc/workspace/store"
      );
      createWorkspace("First Workspace");
      createWorkspace("Second Workspace");

      const workspaces = listWorkspaces();
      expect(workspaces).toHaveLength(2);
      expect(workspaces.map((w) => w.name)).toContain("First Workspace");
      expect(workspaces.map((w) => w.name)).toContain("Second Workspace");
    });

    test("sorts workspaces by createdAt", async () => {
      const { createWorkspace, listWorkspaces } = await import(
        "@/ipc/workspace/store"
      );
      const first = createWorkspace("First");
      await new Promise((r) => setTimeout(r, 10));
      const second = createWorkspace("Second");

      const workspaces = listWorkspaces();
      expect(workspaces[0].id).toBe(first.id);
      expect(workspaces[1].id).toBe(second.id);
    });
  });

  describe("getWorkspace", () => {
    test("returns null for non-existent workspace", async () => {
      const { getWorkspace } = await import("@/ipc/workspace/store");
      expect(getWorkspace("non-existent")).toBeNull();
    });

    test("returns workspace by id", async () => {
      const { createWorkspace, getWorkspace } = await import(
        "@/ipc/workspace/store"
      );
      const created = createWorkspace("Test Workspace");

      const workspace = getWorkspace(created.id);
      expect(workspace).not.toBeNull();
      expect(workspace?.name).toBe("Test Workspace");
      expect(workspace?.id).toBe(created.id);
    });
  });

  describe("createWorkspace", () => {
    test("creates workspace with default agent config", async () => {
      const { createWorkspace } = await import("@/ipc/workspace/store");
      const workspace = createWorkspace("New Workspace");

      expect(workspace.id).toBeDefined();
      expect(workspace.name).toBe("New Workspace");
      expect(workspace.agent.name).toBe("小A");
      expect(workspace.permissions.mode).toBe("review");
    });

    test("creates workspace directory structure", async () => {
      const { createWorkspace } = await import("@/ipc/workspace/store");
      const workspace = createWorkspace("Test");

      const workspaceDir = join(userDataPath, "workspaces", workspace.id);
      expect(existsSync(workspaceDir)).toBe(true);
      expect(existsSync(join(workspaceDir, "skills"))).toBe(true);
      expect(existsSync(join(workspaceDir, "memories"))).toBe(true);
      expect(existsSync(join(workspaceDir, "knowledge"))).toBe(true);
      expect(existsSync(join(workspaceDir, "sessions"))).toBe(true);
    });

    test("creates default MEMORY.md", async () => {
      const { createWorkspace } = await import("@/ipc/workspace/store");
      const workspace = createWorkspace("Test");

      const memoryPath = join(
        userDataPath,
        "workspaces",
        workspace.id,
        "memories",
        "MEMORY.md"
      );
      expect(existsSync(memoryPath)).toBe(true);
      const content = readFileSync(memoryPath, "utf-8");
      expect(content).toContain("长期记忆");
    });

    test("accepts custom agent config", async () => {
      const { createWorkspace } = await import("@/ipc/workspace/store");
      const workspace = createWorkspace("Custom", {
        name: "Custom Agent",
        systemPrompt: "Custom prompt",
      });

      expect(workspace.agent.name).toBe("Custom Agent");
      expect(workspace.agent.systemPrompt).toBe("Custom prompt");
    });
  });

  describe("updateWorkspace", () => {
    test("returns null for non-existent workspace", async () => {
      const { updateWorkspace } = await import("@/ipc/workspace/store");
      const result = updateWorkspace("non-existent", { name: "New Name" });
      expect(result).toBeNull();
    });

    test("updates workspace name", async () => {
      const { createWorkspace, updateWorkspace, getWorkspace } = await import(
        "@/ipc/workspace/store"
      );
      const created = createWorkspace("Original");

      const updated = updateWorkspace(created.id, { name: "Updated" });
      expect(updated?.name).toBe("Updated");

      const workspace = getWorkspace(created.id);
      expect(workspace?.name).toBe("Updated");
    });

    test("updates agent config", async () => {
      const { createWorkspace, updateWorkspace } = await import(
        "@/ipc/workspace/store"
      );
      const created = createWorkspace("Test");

      const updated = updateWorkspace(created.id, {
        agent: { name: "New Agent" },
      });
      expect(updated?.agent.name).toBe("New Agent");
    });

    test("updates permissions", async () => {
      const { createWorkspace, updateWorkspace } = await import(
        "@/ipc/workspace/store"
      );
      const created = createWorkspace("Test");

      const updated = updateWorkspace(created.id, {
        permissions: { mode: "auto" },
      });
      expect(updated?.permissions.mode).toBe("auto");
    });

    test("updates updatedAt timestamp", async () => {
      const { createWorkspace, updateWorkspace } = await import(
        "@/ipc/workspace/store"
      );
      const created = createWorkspace("Test");
      await new Promise((r) => setTimeout(r, 10));

      const updated = updateWorkspace(created.id, { name: "Updated" });
      expect(updated?.updatedAt).toBeGreaterThan(created.updatedAt);
    });
  });

  describe("deleteWorkspace", () => {
    test("returns false for non-existent workspace", async () => {
      const { deleteWorkspace } = await import("@/ipc/workspace/store");
      expect(deleteWorkspace("non-existent")).toBe(false);
    });

    test("deletes workspace directory", async () => {
      const { createWorkspace, deleteWorkspace, getWorkspace, listWorkspaces } =
        await import("@/ipc/workspace/store");
      const created = createWorkspace("To Delete");

      expect(deleteWorkspace(created.id)).toBe(true);
      expect(getWorkspace(created.id)).toBeNull();
      expect(listWorkspaces()).toHaveLength(0);

      const workspaceDir = join(userDataPath, "workspaces", created.id);
      expect(existsSync(workspaceDir)).toBe(false);
    });
  });
});
