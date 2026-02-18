import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { app } from "electron";
import type { z } from "zod";
import type { knowledgeSchema } from "./schemas";

type Knowledge = z.infer<typeof knowledgeSchema>;

function getWorkspacesRoot(): string {
  return join(app.getPath("userData"), "workspaces");
}

function getKnowledgeIndexPath(workspaceId: string): string {
  return join(getWorkspacesRoot(), workspaceId, "knowledge", "index.json");
}

function ensureKnowledgeDir(workspaceId: string): void {
  const dir = join(getWorkspacesRoot(), workspaceId, "knowledge");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function readKnowledgeIndex(workspaceId: string): Knowledge[] {
  const indexPath = getKnowledgeIndexPath(workspaceId);
  if (!existsSync(indexPath)) {
    return [];
  }
  try {
    return JSON.parse(readFileSync(indexPath, "utf-8")) as Knowledge[];
  } catch {
    return [];
  }
}

function writeKnowledgeIndex(workspaceId: string, items: Knowledge[]): void {
  ensureKnowledgeDir(workspaceId);
  writeFileSync(
    getKnowledgeIndexPath(workspaceId),
    JSON.stringify(items, null, 2),
    "utf-8"
  );
}

export function listKnowledge(workspaceId: string): Knowledge[] {
  return readKnowledgeIndex(workspaceId).sort((a, b) => b.addedAt - a.addedAt);
}

export function addKnowledge(
  workspaceId: string,
  name: string,
  type: Knowledge["type"],
  source: string
): Knowledge {
  const items = readKnowledgeIndex(workspaceId);
  const item: Knowledge = {
    id: generateId(),
    workspaceId,
    name: name || basename(source),
    type,
    source,
    status: "pending",
    addedAt: Date.now(),
  };
  items.push(item);
  writeKnowledgeIndex(workspaceId, items);
  return item;
}

export function deleteKnowledge(workspaceId: string, id: string): boolean {
  const items = readKnowledgeIndex(workspaceId);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) {
    return false;
  }
  items.splice(index, 1);
  writeKnowledgeIndex(workspaceId, items);
  return true;
}
