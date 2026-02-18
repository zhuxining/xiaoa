import { ipc } from "@/ipc/manager";

// 类型定义
export interface Memory {
  workspaceId: string;
  content: string;
  updatedAt: number;
}

// 获取记忆
export async function getMemory(workspaceId: string): Promise<Memory> {
  return ipc.client.memory.get({ workspaceId });
}

// 保存记忆
export async function saveMemory(
  workspaceId: string,
  content: string
): Promise<Memory> {
  return ipc.client.memory.save({ workspaceId, content });
}
