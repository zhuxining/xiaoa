import * as fs from "node:fs";
import * as path from "node:path";
import { app } from "electron";
import type { z } from "zod";
import type { agentConfigSchema, workspaceSchema } from "./schemas";

type AgentConfig = z.infer<typeof agentConfigSchema>;
type Workspace = z.infer<typeof workspaceSchema>;

// 默认 Agent 配置
const DEFAULT_AGENT_CONFIG: AgentConfig = {
  name: "小A",
  systemPrompt: "你是一个友好、专业的 AI 助手，致力于帮助用户解决问题。",
  model: "claude-sonnet-4-5-20250514",
};

// 获取工作区根目录
function getWorkspacesRoot(): string {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "workspaces");
}

// 获取工作区目录
function getWorkspaceDir(workspaceId: string): string {
  return path.join(getWorkspacesRoot(), workspaceId);
}

// 获取工作区配置文件路径
function getWorkspaceConfigPath(workspaceId: string): string {
  return path.join(getWorkspaceDir(workspaceId), "workspace.json");
}

// 确保工作区目录存在
function ensureWorkspaceDir(workspaceId: string): void {
  const dir = getWorkspaceDir(workspaceId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });

    // 创建子目录
    const subdirs = ["skills", "memories/daily", "knowledge", "sessions"];
    for (const subdir of subdirs) {
      fs.mkdirSync(path.join(dir, subdir), { recursive: true });
    }

    // 创建默认 MEMORY.md
    const memoryPath = path.join(dir, "memories", "MEMORY.md");
    fs.writeFileSync(
      memoryPath,
      "# 长期记忆\n\n## 用户偏好\n\n## 重要决策\n",
      "utf-8"
    );
  }
}

// 生成唯一 ID
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// 读取所有工作区列表
export function listWorkspaces(): Workspace[] {
  const root = getWorkspacesRoot();
  if (!fs.existsSync(root)) {
    return [];
  }

  const workspaces: Workspace[] = [];
  const dirs = fs.readdirSync(root);

  for (const dir of dirs) {
    const configPath = path.join(root, dir, "workspace.json");
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, "utf-8");
        workspaces.push(JSON.parse(content) as Workspace);
      } catch {
        // 忽略损坏的配置
      }
    }
  }

  return workspaces.sort((a, b) => a.createdAt - b.createdAt);
}

// 获取单个工作区
export function getWorkspace(id: string): Workspace | null {
  const configPath = getWorkspaceConfigPath(id);
  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(content) as Workspace;
  } catch {
    return null;
  }
}

// 创建工作区
export function createWorkspace(
  name: string,
  agent?: Partial<AgentConfig>
): Workspace {
  const id = generateId();
  ensureWorkspaceDir(id);

  const now = Date.now();
  const workspace: Workspace = {
    id,
    name,
    agent: { ...DEFAULT_AGENT_CONFIG, ...agent },
    permissions: {
      mode: "review",
      dangerousAutoConfirm: false,
    },
    createdAt: now,
    updatedAt: now,
  };

  const configPath = getWorkspaceConfigPath(id);
  fs.writeFileSync(configPath, JSON.stringify(workspace, null, 2), "utf-8");

  return workspace;
}

// 更新工作区输入类型
interface UpdateWorkspaceInput {
  name?: string;
  agent?: Partial<AgentConfig>;
  permissions?: Partial<Workspace["permissions"]>;
}

// 更新工作区
export function updateWorkspace(
  id: string,
  updates: UpdateWorkspaceInput
): Workspace | null {
  const workspace = getWorkspace(id);
  if (!workspace) {
    return null;
  }

  const updated: Workspace = {
    ...workspace,
    name: updates.name ?? workspace.name,
    agent: updates.agent
      ? { ...workspace.agent, ...updates.agent }
      : workspace.agent,
    permissions: updates.permissions
      ? ({
          ...workspace.permissions,
          ...updates.permissions,
        } as Workspace["permissions"])
      : workspace.permissions,
    updatedAt: Date.now(),
  };

  const configPath = getWorkspaceConfigPath(id);
  fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), "utf-8");

  return updated;
}

// 删除工作区
export function deleteWorkspace(id: string): boolean {
  const dir = getWorkspaceDir(id);
  if (!fs.existsSync(dir)) {
    return false;
  }

  try {
    fs.rmSync(dir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}
