import { ipc } from "@/ipc/manager";

// 类型定义
export interface Memory {
  content: string;
  updatedAt: number;
  workspaceId: string;
}

// 获取记忆
export async function getMemory(workspaceId: string): Promise<Memory> {
  return await ipc.client.memory.get({ workspaceId });
}

// 保存记忆
export async function saveMemory(
  workspaceId: string,
  content: string
): Promise<Memory> {
  return await ipc.client.memory.save({ workspaceId, content });
}
