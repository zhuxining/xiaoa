import * as fs from "node:fs";
import * as path from "node:path";
import { app } from "electron";
import type { z } from "zod";
import type { memorySchema } from "./schemas";

type Memory = z.infer<typeof memorySchema>;

// 默认记忆内容
const DEFAULT_MEMORY = `# 长期记忆

## 用户偏好

## 重要决策

## 项目信息
`;

// 获取工作区根目录
function getWorkspacesRoot(): string {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "workspaces");
}

// 获取记忆文件路径
function getMemoryPath(workspaceId: string): string {
  return path.join(getWorkspacesRoot(), workspaceId, "memories", "MEMORY.md");
}

// 确保记忆目录存在
function ensureMemoryDir(workspaceId: string): void {
  const dir = path.join(getWorkspacesRoot(), workspaceId, "memories");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 获取记忆内容
export function getMemory(workspaceId: string): Memory {
  const memoryPath = getMemoryPath(workspaceId);

  if (!fs.existsSync(memoryPath)) {
    return {
      workspaceId,
      content: DEFAULT_MEMORY,
      updatedAt: 0,
    };
  }

  try {
    const content = fs.readFileSync(memoryPath, "utf-8");
    const stats = fs.statSync(memoryPath);
    return {
      workspaceId,
      content,
      updatedAt: stats.mtimeMs,
    };
  } catch {
    return {
      workspaceId,
      content: DEFAULT_MEMORY,
      updatedAt: 0,
    };
  }
}

// 保存记忆内容
export function saveMemory(workspaceId: string, content: string): Memory {
  ensureMemoryDir(workspaceId);

  const memoryPath = getMemoryPath(workspaceId);
  fs.writeFileSync(memoryPath, content, "utf-8");

  return {
    workspaceId,
    content,
    updatedAt: Date.now(),
  };
}
