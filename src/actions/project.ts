import { ipc } from "@/ipc/manager";

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  path: string;
}

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
}

export interface FileInfo {
  name: string;
  path: string;
  content: string;
  size: number;
  lastModified: number;
}

export interface AddProjectInput {
  workspaceId: string;
  path: string;
}

export async function getProjects(workspaceId: string): Promise<Project[]> {
  return await ipc.client.project.list({ workspaceId });
}

export async function addProject(input: AddProjectInput): Promise<Project> {
  return await ipc.client.project.add(input);
}

export async function removeProject(
  workspaceId: string,
  id: string
): Promise<{ success: boolean; id: string }> {
  return await ipc.client.project.remove({ workspaceId, id });
}

export async function readDir(
  path: string,
  depth?: number
): Promise<FileNode[]> {
  return await ipc.client.project.readDir({ path, depth });
}

export async function readFile(path: string): Promise<FileInfo> {
  return await ipc.client.project.readFile({ path });
}

export async function selectFolder(): Promise<string | null> {
  return await ipc.client.project.selectFolder();
}
