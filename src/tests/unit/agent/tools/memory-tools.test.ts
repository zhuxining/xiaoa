/**
 * memory-tools.test.ts - 记忆工具单元测试
 *
 * 注：需要 mock node:fs/promises 的测试移到集成测试中
 * 这里只测试不需要 mock 的逻辑
 */

import { describe, expect, test } from "vitest";

describe("memory-tools", () => {
  describe("createMemorySearchTool", () => {
    test("creates tool with correct metadata", async () => {
      const { createMemorySearchTool } = await import(
        "@/agent/tools/memory-tools"
      );
      const tool = createMemorySearchTool(null);
      expect(tool.name).toBe("memory_search");
      expect(tool.label).toBe("搜索记忆");
      expect(tool.description).toContain("搜索记忆库");
      expect(tool.parameters).toBeDefined();
    });

    test("creates tool with workspace scope", async () => {
      const { createMemorySearchTool } = await import(
        "@/agent/tools/memory-tools"
      );
      const tool = createMemorySearchTool("ws-123");
      expect(tool.name).toBe("memory_search");
    });
  });

  describe("createMemoryWriteTool", () => {
    test("creates tool with correct metadata", async () => {
      const { createMemoryWriteTool } = await import(
        "@/agent/tools/memory-tools"
      );
      const tool = createMemoryWriteTool(null);
      expect(tool.name).toBe("memory_write");
      expect(tool.label).toBe("记录日志");
      expect(tool.description).toContain("追加内容");
      expect(tool.parameters).toBeDefined();
    });

    test("creates tool with workspace scope", async () => {
      const { createMemoryWriteTool } = await import(
        "@/agent/tools/memory-tools"
      );
      const tool = createMemoryWriteTool("ws-456");
      expect(tool.name).toBe("memory_write");
    });
  });

  describe("appendDailyLog", () => {
    test("function is exported", async () => {
      const { appendDailyLog } = await import("@/agent/tools/memory-tools");
      expect(typeof appendDailyLog).toBe("function");
    });
  });
});
