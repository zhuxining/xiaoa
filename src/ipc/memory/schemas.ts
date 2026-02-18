import { z } from "zod";

// 获取记忆输入
export const getMemoryInputSchema = z.object({
  workspaceId: z.string(),
});

// 保存记忆输入
export const saveMemoryInputSchema = z.object({
  workspaceId: z.string(),
  content: z.string(),
});

// 记忆数据
export const memorySchema = z.object({
  workspaceId: z.string(),
  content: z.string(),
  updatedAt: z.number(),
});

// 类型导出
export type Memory = z.infer<typeof memorySchema>;
