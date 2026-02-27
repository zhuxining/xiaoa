/**
 * permission.test.ts - 权限请求管理测试
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createMockActiveRun } from "../utils/mock-factory";

// Mock run-store
vi.mock("@/agent/run/run-store", () => ({
  appendEvent: vi.fn(),
}));

vi.mock("@/ipc/chat/schemas", () => ({}));

describe("permission", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("requestPermission", () => {
    test("generates permission request event", async () => {
      const { appendEvent } = await import("@/agent/run/run-store");
      const { requestPermission } = await import(
        "@/agent/extension/permission"
      );
      const run = createMockActiveRun();

      const _promise = requestPermission(run, "bash", { command: "ls -la" });

      expect(appendEvent).toHaveBeenCalledWith(
        run.key,
        expect.objectContaining({
          type: "permission_request",
          permissionType: "execute",
          permissionTitle: expect.stringContaining("执行命令"),
        })
      );

      // Clean up - respond to prevent hanging
      vi.advanceTimersByTime(100);
    });

    test("resolves when responded with allow", async () => {
      const { requestPermission, respondToPermission } = await import(
        "@/agent/extension/permission"
      );
      const run = createMockActiveRun({ key: "test-respond-allow" });

      const promise = requestPermission(run, "bash", { command: "test" });

      // Respond to the permission request
      // First, we need to get the permissionId from the appendEvent call
      const { appendEvent } = await import("@/agent/run/run-store");
      const call = (appendEvent as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => c[1].type === "permission_request"
      );
      const permissionId = call?.[1]?.permissionId;

      respondToPermission(run.key, permissionId, "allow", false);

      const result = await promise;
      expect(result.decision).toBe("allow");
      expect(result.alwaysAllow).toBe(false);
    });

    test("resolves when responded with deny", async () => {
      const { requestPermission, respondToPermission } = await import(
        "@/agent/extension/permission"
      );
      const run = createMockActiveRun({ key: "test-respond-deny" });

      const promise = requestPermission(run, "bash", { command: "test" });

      const { appendEvent } = await import("@/agent/run/run-store");
      const call = (appendEvent as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => c[1].type === "permission_request"
      );
      const permissionId = call?.[1]?.permissionId;

      respondToPermission(run.key, permissionId, "deny", false);

      const result = await promise;
      expect(result.decision).toBe("deny");
    });

    test("respects alwaysAllow flag", async () => {
      const { requestPermission, respondToPermission } = await import(
        "@/agent/extension/permission"
      );
      const run = createMockActiveRun({ key: "test-always-allow" });

      const promise = requestPermission(run, "bash", { command: "test" });

      const { appendEvent } = await import("@/agent/run/run-store");
      const call = (appendEvent as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => c[1].type === "permission_request"
      );
      const permissionId = call?.[1]?.permissionId;

      respondToPermission(run.key, permissionId, "allow", true);

      const result = await promise;
      expect(result.decision).toBe("allow");
      expect(result.alwaysAllow).toBe(true);
    });

    test("times out after 5 minutes", async () => {
      const { requestPermission } = await import(
        "@/agent/extension/permission"
      );
      const run = createMockActiveRun({ key: "test-timeout" });

      const promise = requestPermission(run, "bash", { command: "test" });

      // Advance time by 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000);

      await expect(promise).rejects.toThrow("权限请求超时");
    });
  });

  describe("respondToPermission", () => {
    test("returns false for non-existent permission", async () => {
      const { respondToPermission } = await import(
        "@/agent/extension/permission"
      );
      const result = respondToPermission("non-existent", "perm-123", "allow");
      expect(result).toBe(false);
    });
  });

  describe("cancelPendingPermissions", () => {
    test("rejects all pending permissions for a run", async () => {
      const {
        requestPermission,
        cancelPendingPermissions,
        respondToPermission,
      } = await import("@/agent/extension/permission");
      const run = createMockActiveRun({ key: "test-cancel" });

      const promise1 = requestPermission(run, "bash", { command: "test1" });
      const promise2 = requestPermission(run, "write", { file_path: "/test" });

      cancelPendingPermissions(run.key);

      await expect(promise1).rejects.toThrow("运行已中止");
      await expect(promise2).rejects.toThrow("运行已中止");

      // Subsequent respond should fail
      const result = respondToPermission(run.key, "any-perm", "allow");
      expect(result).toBe(false);
    });
  });

  describe("resolvePermissionType", () => {
    test("returns execute for bash tool", async () => {
      const { appendEvent } = await import("@/agent/run/run-store");
      const { requestPermission } = await import(
        "@/agent/extension/permission"
      );
      const run = createMockActiveRun({ key: "test-type-bash" });

      requestPermission(run, "bash", { command: "test" });

      const call = (appendEvent as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => c[1].type === "permission_request"
      );
      expect(call?.[1]?.permissionType).toBe("execute");
    });

    test("returns file_write for write tool", async () => {
      const { appendEvent } = await import("@/agent/run/run-store");
      const { requestPermission } = await import(
        "@/agent/extension/permission"
      );
      const run = createMockActiveRun({ key: "test-type-write" });

      requestPermission(run, "write", { file_path: "/test.txt" });

      const call = (appendEvent as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => c[1].type === "permission_request"
      );
      expect(call?.[1]?.permissionType).toBe("file_write");
    });

    test("returns file_write for edit tool", async () => {
      const { appendEvent } = await import("@/agent/run/run-store");
      const { requestPermission } = await import(
        "@/agent/extension/permission"
      );
      const run = createMockActiveRun({ key: "test-type-edit" });

      requestPermission(run, "edit", { file_path: "/test.txt" });

      const call = (appendEvent as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => c[1].type === "permission_request"
      );
      expect(call?.[1]?.permissionType).toBe("file_write");
    });

    test("returns file_read for read tool", async () => {
      const { appendEvent } = await import("@/agent/run/run-store");
      const { requestPermission } = await import(
        "@/agent/extension/permission"
      );
      const run = createMockActiveRun({ key: "test-type-read" });

      requestPermission(run, "read", { file_path: "/test.txt" });

      const call = (appendEvent as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => c[1].type === "permission_request"
      );
      expect(call?.[1]?.permissionType).toBe("file_read");
    });

    test("returns execute for unknown tool", async () => {
      const { appendEvent } = await import("@/agent/run/run-store");
      const { requestPermission } = await import(
        "@/agent/extension/permission"
      );
      const run = createMockActiveRun({ key: "test-type-unknown" });

      requestPermission(run, "unknown_tool", { data: "test" });

      const call = (appendEvent as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => c[1].type === "permission_request"
      );
      expect(call?.[1]?.permissionType).toBe("execute");
    });
  });

  describe("resolvePermissionTitle", () => {
    test("includes truncated command for bash", async () => {
      const { appendEvent } = await import("@/agent/run/run-store");
      const { requestPermission } = await import(
        "@/agent/extension/permission"
      );
      const run = createMockActiveRun({ key: "test-title-bash" });

      requestPermission(run, "bash", { command: "echo hello world" });

      const call = (appendEvent as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => c[1].type === "permission_request"
      );
      expect(call?.[1]?.permissionTitle).toContain("echo hello world");
    });

    test("truncates long commands", async () => {
      const { appendEvent } = await import("@/agent/run/run-store");
      const { requestPermission } = await import(
        "@/agent/extension/permission"
      );
      const run = createMockActiveRun({ key: "test-title-truncate" });

      const longCommand = "a".repeat(100);
      requestPermission(run, "bash", { command: longCommand });

      const call = (appendEvent as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => c[1].type === "permission_request"
      );
      expect(call?.[1]?.permissionTitle.length).toBeLessThan(100);
    });

    test("includes file path for write", async () => {
      const { appendEvent } = await import("@/agent/run/run-store");
      const { requestPermission } = await import(
        "@/agent/extension/permission"
      );
      const run = createMockActiveRun({ key: "test-title-write" });

      requestPermission(run, "write", { file_path: "/path/to/file.txt" });

      const call = (appendEvent as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => c[1].type === "permission_request"
      );
      expect(call?.[1]?.permissionTitle).toContain("/path/to/file.txt");
    });

    test("includes file path for edit", async () => {
      const { appendEvent } = await import("@/agent/run/run-store");
      const { requestPermission } = await import(
        "@/agent/extension/permission"
      );
      const run = createMockActiveRun({ key: "test-title-edit" });

      requestPermission(run, "edit", { file_path: "/path/to/edit.txt" });

      const call = (appendEvent as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => c[1].type === "permission_request"
      );
      expect(call?.[1]?.permissionTitle).toContain("/path/to/edit.txt");
    });
  });
});
