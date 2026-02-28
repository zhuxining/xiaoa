/**
 * knowledge-tools.test.ts - 知识库工具单元测试
 *
 * 注：需要 mock node:fs/promises 的测试移到集成测试中
 * 这里只测试不需要 mock 的逻辑
 */

import { describe, expect, test } from "vitest";

describe("knowledge-tools", () => {
  describe("createKnowledgeReadTool", () => {
    test("creates tool with correct metadata", async () => {
      const { createKnowledgeReadTool } = await import(
        "@/agent/tools/knowledge-tools"
      );
      const tool = createKnowledgeReadTool(null);
      expect(tool.name).toBe("knowledge_read");
      expect(tool.label).toBe("读取知识");
      expect(tool.description).toContain("读取知识库");
      expect(tool.parameters).toBeDefined();
    });

    test("creates tool with workspace scope", async () => {
      const { createKnowledgeReadTool } = await import(
        "@/agent/tools/knowledge-tools"
      );
      const tool = createKnowledgeReadTool("ws-789");
      expect(tool.name).toBe("knowledge_read");
    });
  });

  describe("createKnowledgeListTool", () => {
    test("creates tool with correct metadata", async () => {
      const { createKnowledgeListTool } = await import(
        "@/agent/tools/knowledge-tools"
      );
      const tool = createKnowledgeListTool(null);
      expect(tool.name).toBe("knowledge_list");
      expect(tool.label).toBe("列出知识");
      expect(tool.description).toContain("列出知识库");
      expect(tool.parameters).toBeDefined();
    });

    test("creates tool with workspace scope", async () => {
      const { createKnowledgeListTool } = await import(
        "@/agent/tools/knowledge-tools"
      );
      const tool = createKnowledgeListTool("ws-abc");
      expect(tool.name).toBe("knowledge_list");
    });
  });
});
