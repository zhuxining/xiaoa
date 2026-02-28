/**
 * session-lifecycle.test.ts - Session 完整生命周期集成测试
 */

import type { CreateAgentSessionResult } from "@mariozechner/pi-coding-agent";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  cleanupTempDir,
  createMockXiaoaDataDir,
  createTempDir,
} from "../utils/fs-helpers";

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

describe("Session Lifecycle Integration", () => {
  let tempDir: string;
  let dataDir: string;

  beforeEach(async () => {
    tempDir = createTempDir("session-lifecycle");
    dataDir = createMockXiaoaDataDir(tempDir);

    // 设置 mock userData 路径
    const electron = await import("electron");
    (
      electron as unknown as {
        _setMockUserDataPath: (path: string) => void;
      }
    )._setMockUserDataPath(dataDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
    vi.resetModules();
  });

  describe("SessionPool", () => {
    test("creates and caches session", async () => {
      const { getOrCreateSession, disposeAll, hasSession } = await import(
        "@/agent/session/session-pool"
      );

      // Mock session factory
      const mockSessionFactory = vi.fn().mockResolvedValue({
        session: {
          prompt: vi.fn(),
          abort: vi.fn(),
          subscribe: vi.fn().mockReturnValue(() => {}),
          dispose: vi.fn(),
          messages: [],
        },
        subscribe: vi.fn().mockReturnValue(() => {}),
        extensionsResult: undefined,
      } as unknown as CreateAgentSessionResult);

      // First call creates session
      const first = await getOrCreateSession("test-key-1", mockSessionFactory);
      expect(first.isResumed).toBe(false);
      expect(mockSessionFactory).toHaveBeenCalledTimes(1);

      // Second call returns cached session
      const second = await getOrCreateSession("test-key-1", mockSessionFactory);
      expect(second.isResumed).toBe(true);
      expect(mockSessionFactory).toHaveBeenCalledTimes(1); // Still 1

      expect(hasSession("test-key-1")).toBe(true);

      disposeAll();
    });

    test("disposes session correctly", async () => {
      const { getOrCreateSession, disposeSession, hasSession, disposeAll } =
        await import("@/agent/session/session-pool");

      const mockDispose = vi.fn();
      const mockSessionFactory = vi.fn().mockResolvedValue({
        session: {
          prompt: vi.fn(),
          abort: vi.fn(),
          subscribe: vi.fn().mockReturnValue(() => {}),
          dispose: mockDispose,
          messages: [],
        },
        subscribe: vi.fn().mockReturnValue(() => {}),
        extensionsResult: undefined,
      } as unknown as CreateAgentSessionResult);

      await getOrCreateSession("test-key-2", mockSessionFactory);
      expect(hasSession("test-key-2")).toBe(true);

      disposeSession("test-key-2");
      expect(hasSession("test-key-2")).toBe(false);
      expect(mockDispose).toHaveBeenCalledTimes(1);

      disposeAll();
    });

    test("handles multiple sessions independently", async () => {
      const { getOrCreateSession, hasSession, disposeAll } = await import(
        "@/agent/session/session-pool"
      );

      const createMockSession = (_id: string): CreateAgentSessionResult =>
        ({
          session: {
            prompt: vi.fn(),
            abort: vi.fn(),
            subscribe: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(),
            messages: [],
          },
          subscribe: vi.fn().mockReturnValue(() => {}),
          extensionsResult: undefined,
        }) as unknown as CreateAgentSessionResult;

      await getOrCreateSession("key-a", () =>
        Promise.resolve(createMockSession("a"))
      );
      await getOrCreateSession("key-b", () =>
        Promise.resolve(createMockSession("b"))
      );

      expect(hasSession("key-a")).toBe(true);
      expect(hasSession("key-b")).toBe(true);

      disposeAll();

      expect(hasSession("key-a")).toBe(false);
      expect(hasSession("key-b")).toBe(false);
    });
  });
});
