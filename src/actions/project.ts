import { ipc } from "@/ipc/manager";

export interface Project {
  id: string;
  name: string;
  path: string;
  workspaceId: string;
}

export interface FileNode {
  children?: FileNode[];
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
}

export interface FileInfo {
  content: string;
  lastModified: number;
  name: string;
  path: string;
  size: number;
}

export interface AddProjectInput {
  path: string;
  workspaceId: string;
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
