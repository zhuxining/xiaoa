import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, join } from "node:path";
import { app } from "electron";
import type { z } from "zod";
import type { knowledgeSchema } from "./schemas";

type Knowledge = z.infer<typeof knowledgeSchema>;

interface LegacyKnowledge {
  id: string;
  workspaceId: string;
  name: string;
  type?: "file" | "url";
  source?: string;
  status?: "pending" | "ready" | "error";
  error?: string;
  addedAt?: number;
}

const workspaceQueues = new Map<string, Promise<void>>();
const TITLE_REGEX = /<title[^>]*>([\s\S]*?)<\/title>/i;
const SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const STYLE_REGEX = /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi;
const NOSCRIPT_REGEX =
  /<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi;

function getWorkspacesRoot(): string {
  return join(app.getPath("userData"), "workspaces");
}

function getKnowledgeDir(workspaceId: string): string {
  return join(getWorkspacesRoot(), workspaceId, "knowledge");
}

function getKnowledgeIndexPath(workspaceId: string): string {
  return join(getKnowledgeDir(workspaceId), "index.json");
}

function getParsedFilePath(workspaceId: string, id: string): string {
  return join(getKnowledgeDir(workspaceId), `${id}.md`);
}

function ensureKnowledgeDir(workspaceId: string): void {
  const dir = getKnowledgeDir(workspaceId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function toLegacyType(sourceType: Knowledge["sourceType"]): "file" | "url" {
  return sourceType === "local" ? "file" : "url";
}

function resolveSourceType(
  raw: Knowledge | LegacyKnowledge
): Knowledge["sourceType"] {
  if ("sourceType" in raw && raw.sourceType) {
    return raw.sourceType;
  }
  if (raw.type === "url") {
    return "url";
  }
  return "local";
}

function resolveOriginalPath(
  raw: Knowledge | LegacyKnowledge,
  sourceType: Knowledge["sourceType"]
): string | undefined {
  if ("originalPath" in raw && typeof raw.originalPath === "string") {
    return raw.originalPath;
  }
  if (sourceType === "local" && typeof raw.source === "string") {
    return raw.source;
  }
  return undefined;
}

function resolveOriginalUrl(
  raw: Knowledge | LegacyKnowledge,
  sourceType: Knowledge["sourceType"]
): string | undefined {
  if ("originalUrl" in raw && typeof raw.originalUrl === "string") {
    return raw.originalUrl;
  }
  if (sourceType === "url" && typeof raw.source === "string") {
    return raw.source;
  }
  return undefined;
}

function resolveStatus(raw: Knowledge | LegacyKnowledge): Knowledge["status"] {
  if (
    raw.status === "pending" ||
    raw.status === "parsing" ||
    raw.status === "ready" ||
    raw.status === "error"
  ) {
    return raw.status;
  }
  return "pending";
}

function resolveUpdatedAt(
  raw: Knowledge | LegacyKnowledge,
  addedAt: number
): number {
  if ("updatedAt" in raw && typeof raw.updatedAt === "number") {
    return raw.updatedAt;
  }
  return addedAt;
}

function normalizeKnowledge(
  workspaceId: string,
  raw: Knowledge | LegacyKnowledge
): Knowledge {
  const sourceType = resolveSourceType(raw);
  const originalPath = resolveOriginalPath(raw, sourceType);
  const originalUrl = resolveOriginalUrl(raw, sourceType);
  const status = resolveStatus(raw);

  const addedAt = typeof raw.addedAt === "number" ? raw.addedAt : Date.now();
  const updatedAt = resolveUpdatedAt(raw, addedAt);

  return {
    id: raw.id,
    workspaceId,
    name: raw.name || basename(originalPath || originalUrl || raw.id),
    sourceType,
    type: toLegacyType(sourceType),
    source: sourceType === "local" ? originalPath : originalUrl,
    originalPath,
    originalUrl,
    mimeType:
      "mimeType" in raw && typeof raw.mimeType === "string"
        ? raw.mimeType
        : undefined,
    parsedFile:
      "parsedFile" in raw && typeof raw.parsedFile === "string"
        ? raw.parsedFile
        : undefined,
    description:
      "description" in raw && typeof raw.description === "string"
        ? raw.description
        : undefined,
    status,
    error: typeof raw.error === "string" ? raw.error : undefined,
    addedAt,
    parsedAt:
      "parsedAt" in raw && typeof raw.parsedAt === "number"
        ? raw.parsedAt
        : undefined,
    updatedAt,
  };
}

function readKnowledgeIndex(workspaceId: string): Knowledge[] {
  const indexPath = getKnowledgeIndexPath(workspaceId);
  if (!existsSync(indexPath)) {
    return [];
  }
  try {
    const raw = JSON.parse(readFileSync(indexPath, "utf-8")) as Array<
      Knowledge | LegacyKnowledge
    >;
    return raw.map((item) => normalizeKnowledge(workspaceId, item));
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

function updateKnowledge(
  workspaceId: string,
  id: string,
  updater: (item: Knowledge) => Knowledge
): Knowledge | null {
  const items = readKnowledgeIndex(workspaceId);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) {
    return null;
  }

  items[index] = updater(items[index]);
  writeKnowledgeIndex(workspaceId, items);
  return items[index];
}

function enqueueWorkspaceTask(
  workspaceId: string,
  task: () => Promise<void>
): Promise<void> {
  const previous = workspaceQueues.get(workspaceId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(task);
  workspaceQueues.set(
    workspaceId,
    next.finally(() => {
      if (workspaceQueues.get(workspaceId) === next) {
        workspaceQueues.delete(workspaceId);
      }
    })
  );
  return next;
}

function escapeYamlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function htmlToText(html: string): { title: string; content: string } {
  const noScripts = html
    .replace(SCRIPT_REGEX, "")
    .replace(STYLE_REGEX, "")
    .replace(NOSCRIPT_REGEX, "");

  const titleMatch = noScripts.match(TITLE_REGEX);
  const title = titleMatch?.[1]?.replace(/\s+/g, " ").trim() ?? "";

  const text = noScripts
    .replace(/<\/(h\d|p|div|li|section|article|br|tr|td)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+/g, " ")
    .trim();

  return { title, content: text };
}

function buildDescription(markdown: string): string {
  const plain = markdown
    .replace(/^#+\s/gm, "")
    .replace(/`+/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return plain.slice(0, 180);
}

function buildMarkdownDocument(item: Knowledge, content: string): string {
  const parsedAt = Date.now();
  const description = buildDescription(content);
  const lines = [
    "---",
    `name: "${escapeYamlString(item.name)}"`,
    `description: "${escapeYamlString(description)}"`,
    `sourceType: "${item.sourceType}"`,
  ];
  if (item.originalPath) {
    lines.push(`originalPath: "${escapeYamlString(item.originalPath)}"`);
  }
  if (item.originalUrl) {
    lines.push(`originalUrl: "${escapeYamlString(item.originalUrl)}"`);
  }
  lines.push(`parsedAt: ${parsedAt}`, "---", "", content.trim(), "");
  return lines.join("\n");
}

async function parseKnowledgeContent(item: Knowledge): Promise<string> {
  if (item.sourceType === "local") {
    const path = item.originalPath;
    if (!path) {
      throw new Error("MISSING_LOCAL_PATH");
    }
    const ext = extname(path).toLowerCase();
    if (![".txt", ".md"].includes(ext)) {
      throw new Error("UNSUPPORTED_FORMAT");
    }
    return readFileSync(path, "utf-8");
  }

  const url = item.originalUrl;
  if (!url) {
    throw new Error("MISSING_URL");
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`URL_FETCH_FAILED:${response.status}`);
  }
  const html = await response.text();
  const { title, content } = htmlToText(html);
  if (!content) {
    throw new Error("EMPTY_URL_CONTENT");
  }
  return title ? `# ${title}\n\n${content}` : content;
}

async function runParse(workspaceId: string, id: string): Promise<void> {
  const parsing = updateKnowledge(workspaceId, id, (item) => ({
    ...item,
    status: "parsing",
    error: undefined,
    updatedAt: Date.now(),
  }));
  if (!parsing) {
    return;
  }

  try {
    const parsedContent = await parseKnowledgeContent(parsing);
    const markdown = buildMarkdownDocument(parsing, parsedContent);
    const parsedFile = `${parsing.id}.md`;
    writeFileSync(
      getParsedFilePath(workspaceId, parsing.id),
      markdown,
      "utf-8"
    );

    updateKnowledge(workspaceId, parsing.id, (item) => ({
      ...item,
      parsedFile,
      description: buildDescription(parsedContent),
      status: "ready",
      parsedAt: Date.now(),
      error: undefined,
      updatedAt: Date.now(),
    }));
  } catch (error) {
    let reason = "解析失败";
    if (error instanceof Error) {
      if (error.message === "UNSUPPORTED_FORMAT") {
        reason = "当前仅支持 txt/md/url 解析，pdf/docx/image 暂不支持";
      } else {
        reason = error.message;
      }
    }
    updateKnowledge(workspaceId, parsing.id, (item) => ({
      ...item,
      status: "error",
      error: reason,
      updatedAt: Date.now(),
    }));
  }
}

function enqueueParse(workspaceId: string, id: string): void {
  enqueueWorkspaceTask(workspaceId, () => runParse(workspaceId, id)).catch(
    (error) => {
      console.error("enqueueParse failed", error);
    }
  );
}

export function listKnowledge(workspaceId: string): Knowledge[] {
  const items = readKnowledgeIndex(workspaceId).sort(
    (a, b) => b.addedAt - a.addedAt
  );
  // Persist migrated shape.
  writeKnowledgeIndex(workspaceId, items);
  return items;
}

interface AddKnowledgeInput {
  workspaceId: string;
  name: string;
  sourceType: Knowledge["sourceType"];
  originalPath?: string;
  originalUrl?: string;
  mimeType?: string;
}

export function addKnowledge(input: AddKnowledgeInput): Knowledge {
  const { workspaceId, name, sourceType, originalPath, originalUrl, mimeType } =
    input;
  const items = readKnowledgeIndex(workspaceId);
  const id = generateId();
  const now = Date.now();
  const item: Knowledge = {
    id,
    workspaceId,
    name: name || basename(originalPath || originalUrl || id),
    sourceType,
    type: toLegacyType(sourceType),
    source: sourceType === "local" ? originalPath : originalUrl,
    originalPath,
    originalUrl,
    mimeType,
    status: "pending",
    addedAt: now,
    updatedAt: now,
  };
  items.push(item);
  writeKnowledgeIndex(workspaceId, items);
  enqueueParse(workspaceId, id);
  return item;
}

export function reparseKnowledge(
  workspaceId: string,
  id: string
): Knowledge | null {
  const item = updateKnowledge(workspaceId, id, (current) => ({
    ...current,
    status: "pending",
    error: undefined,
    updatedAt: Date.now(),
  }));
  if (!item) {
    return null;
  }
  enqueueParse(workspaceId, id);
  return item;
}

export function getKnowledgeContent(
  workspaceId: string,
  id: string
): { id: string; content: string; parsedFile: string } | null {
  const item = readKnowledgeIndex(workspaceId).find((entry) => entry.id === id);
  if (!item || item.status !== "ready" || !item.parsedFile) {
    return null;
  }

  const path = getParsedFilePath(workspaceId, id);
  if (!existsSync(path)) {
    return null;
  }
  return {
    id,
    parsedFile: item.parsedFile,
    content: readFileSync(path, "utf-8"),
  };
}

export function deleteKnowledge(workspaceId: string, id: string): boolean {
  const items = readKnowledgeIndex(workspaceId);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) {
    return false;
  }

  const removed = items[index];
  items.splice(index, 1);
  writeKnowledgeIndex(workspaceId, items);
  if (removed.parsedFile) {
    const parsedPath = getParsedFilePath(workspaceId, removed.id);
    if (existsSync(parsedPath)) {
      rmSync(parsedPath, { force: true });
    }
  }
  return true;
}
