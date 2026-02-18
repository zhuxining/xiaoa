import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { app } from "electron";
import type { FileInfo, FileNode, Project } from "./schemas";

const FILE_SIZE_LIMIT = 1024 * 1024; // 1MB

function getWorkspacesRoot(): string {
  return join(app.getPath("userData"), "workspaces");
}

function getProjectsPath(workspaceId: string): string {
  return join(getWorkspacesRoot(), workspaceId, "projects.json");
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function readProjects(workspaceId: string): Project[] {
  const path = getProjectsPath(workspaceId);
  if (!existsSync(path)) {
    return [];
  }
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as Project[];
  } catch {
    return [];
  }
}

function writeProjects(workspaceId: string, projects: Project[]): void {
  writeFileSync(
    getProjectsPath(workspaceId),
    JSON.stringify(projects, null, 2),
    "utf-8"
  );
}

export function listProjects(workspaceId: string): Project[] {
  return readProjects(workspaceId);
}

export function addProject(workspaceId: string, dirPath: string): Project {
  const projects = readProjects(workspaceId);
  const project: Project = {
    id: generateId(),
    workspaceId,
    name: basename(dirPath),
    path: dirPath,
  };
  projects.push(project);
  writeProjects(workspaceId, projects);
  return project;
}

export function removeProject(workspaceId: string, id: string): boolean {
  const projects = readProjects(workspaceId);
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) {
    return false;
  }
  projects.splice(index, 1);
  writeProjects(workspaceId, projects);
  return true;
}

export function readDir(dirPath: string, depth = 1): FileNode[] {
  if (!existsSync(dirPath)) {
    return [];
  }
  try {
    return readdirSync(dirPath)
      .filter((name) => !name.startsWith("."))
      .map((name) => {
        const fullPath = join(dirPath, name);
        const isDir = statSync(fullPath).isDirectory();
        const node: FileNode = {
          id: fullPath,
          name,
          path: fullPath,
          type: isDir ? "folder" : "file",
        };
        if (isDir && depth > 1) {
          node.children = readDir(fullPath, depth - 1);
        }
        return node;
      })
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "folder" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  } catch {
    return [];
  }
}

export function readFile(filePath: string): FileInfo {
  const stat = statSync(filePath);
  if (stat.size > FILE_SIZE_LIMIT) {
    return {
      name: basename(filePath),
      path: filePath,
      content: `（文件过大，无法预览，大小：${(stat.size / 1024).toFixed(1)} KB）`,
      size: stat.size,
      lastModified: stat.mtimeMs,
    };
  }
  return {
    name: basename(filePath),
    path: filePath,
    content: readFileSync(filePath, "utf-8"),
    size: stat.size,
    lastModified: stat.mtimeMs,
  };
}
