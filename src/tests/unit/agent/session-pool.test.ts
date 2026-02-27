/**
 * session-pool.test.ts - SessionPool 缓存逻辑测试
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createMockSessionResult } from "../utils/mock-factory";

// Mock pi-coding-agent
vi.mock("@mariozechner/pi-coding-agent", () => ({}));

describe("session-pool", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getOrCreateSession", () => {
    test("creates new session when not in pool", async () => {
      const { getOrCreateSession, disposeAll } = await import(
        "@/agent/session/session-pool"
      );
      const mockResult = createMockSessionResult();
      const createFn = vi.fn().mockResolvedValue(mockResult);

      const { result, isResumed } = await getOrCreateSession(
        "test-key-1",
        createFn
      );

      expect(createFn).toHaveBeenCalledTimes(1);
      expect(isResumed).toBe(false);
      expect(result).toBe(mockResult);

      disposeAll();
    });

    test("returns cached session when already in pool", async () => {
      const { getOrCreateSession, disposeAll } = await import(
        "@/agent/session/session-pool"
      );
      const mockResult = createMockSessionResult();
      const createFn = vi.fn().mockResolvedValue(mockResult);

      // First call - creates
      const first = await getOrCreateSession("test-key-2", createFn);
      expect(first.isResumed).toBe(false);
      expect(createFn).toHaveBeenCalledTimes(1);

      // Second call - returns cached
      const second = await getOrCreateSession("test-key-2", createFn);
      expect(second.isResumed).toBe(true);
      expect(second.result).toBe(mockResult);
      expect(createFn).toHaveBeenCalledTimes(1); // Still 1

      disposeAll();
    });

    test("different keys create different sessions", async () => {
      const { getOrCreateSession, disposeAll } = await import(
        "@/agent/session/session-pool"
      );
      const mockResult1 = createMockSessionResult();
      const mockResult2 = createMockSessionResult();
      const createFn = vi
        .fn()
        .mockResolvedValueOnce(mockResult1)
        .mockResolvedValueOnce(mockResult2);

      const first = await getOrCreateSession("key-a", createFn);
      const second = await getOrCreateSession("key-b", createFn);

      expect(first.isResumed).toBe(false);
      expect(second.isResumed).toBe(false);
      expect(first.result).not.toBe(second.result);
      expect(createFn).toHaveBeenCalledTimes(2);

      disposeAll();
    });
  });

  describe("releaseSession", () => {
    test("releases session without disposing", async () => {
      const { getOrCreateSession, releaseSession, hasSession, disposeAll } =
        await import("@/agent/session/session-pool");
      const mockResult = createMockSessionResult();
      const createFn = vi.fn().mockResolvedValue(mockResult);

      await getOrCreateSession("test-key-3", createFn);
      expect(hasSession("test-key-3")).toBe(true);

      releaseSession("test-key-3");
      expect(hasSession("test-key-3")).toBe(true); // Still in pool

      disposeAll();
    });
  });

  describe("disposeSession", () => {
    test("disposes and removes session from pool", async () => {
      const { getOrCreateSession, disposeSession, hasSession, disposeAll } =
        await import("@/agent/session/session-pool");
      const mockResult = createMockSessionResult();
      const createFn = vi.fn().mockResolvedValue(mockResult);

      await getOrCreateSession("test-key-4", createFn);
      expect(hasSession("test-key-4")).toBe(true);

      disposeSession("test-key-4");
      expect(hasSession("test-key-4")).toBe(false);
      expect(mockResult.session.dispose).toHaveBeenCalledTimes(1);

      disposeAll();
    });

    test("does nothing for non-existent key", async () => {
      const { disposeSession, disposeAll } = await import(
        "@/agent/session/session-pool"
      );
      // Should not throw
      expect(() => disposeSession("non-existent")).not.toThrow();

      disposeAll();
    });
  });

  describe("disposeAll", () => {
    test("disposes all sessions in pool", async () => {
      const { getOrCreateSession, disposeAll, hasSession } = await import(
        "@/agent/session/session-pool"
      );

      const mockResult1 = createMockSessionResult();
      const mockResult2 = createMockSessionResult();
      const createFn1 = vi.fn().mockResolvedValue(mockResult1);
      const createFn2 = vi.fn().mockResolvedValue(mockResult2);

      await getOrCreateSession("key-1", createFn1);
      await getOrCreateSession("key-2", createFn2);

      expect(hasSession("key-1")).toBe(true);
      expect(hasSession("key-2")).toBe(true);

      disposeAll();

      expect(hasSession("key-1")).toBe(false);
      expect(hasSession("key-2")).toBe(false);
      expect(mockResult1.session.dispose).toHaveBeenCalledTimes(1);
      expect(mockResult2.session.dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe("hasSession", () => {
    test("returns false for non-existent key", async () => {
      const { hasSession, disposeAll } = await import(
        "@/agent/session/session-pool"
      );
      expect(hasSession("non-existent")).toBe(false);

      disposeAll();
    });

    test("returns true for cached session", async () => {
      const { getOrCreateSession, hasSession, disposeAll } = await import(
        "@/agent/session/session-pool"
      );
      const mockResult = createMockSessionResult();
      const createFn = vi.fn().mockResolvedValue(mockResult);

      await getOrCreateSession("test-key-5", createFn);
      expect(hasSession("test-key-5")).toBe(true);

      disposeAll();
    });
  });

  describe("getPooledSession", () => {
    test("returns undefined for non-existent key", async () => {
      const { getPooledSession, disposeAll } = await import(
        "@/agent/session/session-pool"
      );
      expect(getPooledSession("non-existent")).toBeUndefined();

      disposeAll();
    });

    test("returns session result for cached key", async () => {
      const { getOrCreateSession, getPooledSession, disposeAll } = await import(
        "@/agent/session/session-pool"
      );
      const mockResult = createMockSessionResult();
      const createFn = vi.fn().mockResolvedValue(mockResult);

      await getOrCreateSession("test-key-6", createFn);
      const pooled = getPooledSession("test-key-6");

      expect(pooled).toBe(mockResult);

      disposeAll();
    });
  });
});
