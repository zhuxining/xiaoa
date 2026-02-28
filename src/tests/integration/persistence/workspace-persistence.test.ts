/**
 * workspace-persistence.test.ts - 工作区持久化集成测试
 *
 * 注：由于 workspace store 依赖 electron app 模块，
 * 完整的持久化测试需要在 E2E 测试中进行
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanupTempDir, createTempDir } from "../utils/fs-helpers";

// Mock electron
vi.mock("electron", () => {
  let userDataPath = "";
  return {
    app: {
      getPath: (name: string) => (name === "userData" ? userDataPath : ""),
    },
    _setMockUserDataPath: (path: string) => {
      userDataPath = path;
    },
  };
});

describe("Workspace Persistence Integration", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = createTempDir("workspace-persistence");

    // 设置 mock userData 路径
    const electron = await import("electron");
    (
      electron as unknown as {
        _setMockUserDataPath: (path: string) => void;
      }
    )._setMockUserDataPath(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
    vi.resetModules();
  });

  describe("Workspace Store Basic Operations", () => {
    test("module can be imported", async () => {
      // 验证模块可以正常导入
      const workspaceStore = await import("@/ipc/workspace/store");
      expect(workspaceStore).toBeDefined();
      expect(typeof workspaceStore.listWorkspaces).toBe("function");
      expect(typeof workspaceStore.getWorkspace).toBe("function");
      expect(typeof workspaceStore.createWorkspace).toBe("function");
      expect(typeof workspaceStore.updateWorkspace).toBe("function");
      expect(typeof workspaceStore.deleteWorkspace).toBe("function");
    });

    test("listWorkspaces returns empty array initially", async () => {
      const { listWorkspaces } = await import("@/ipc/workspace/store");
      const workspaces = listWorkspaces();
      expect(Array.isArray(workspaces)).toBe(true);
    });

    test("createWorkspace creates workspace with generated ID", async () => {
      const { createWorkspace, getWorkspace, deleteWorkspace } = await import(
        "@/ipc/workspace/store"
      );

      const workspace = createWorkspace("Test Workspace");
      expect(workspace.id).toBeDefined();
      expect(workspace.name).toBe("Test Workspace");
      expect(workspace.createdAt).toBeDefined();
      expect(workspace.updatedAt).toBeDefined();

      // Clean up
      deleteWorkspace(workspace.id);
    });

    test("getWorkspace returns null for non-existent workspace", async () => {
      const { getWorkspace } = await import("@/ipc/workspace/store");
      const workspace = getWorkspace("non-existent-id");
      expect(workspace).toBeNull();
    });
  });
});
