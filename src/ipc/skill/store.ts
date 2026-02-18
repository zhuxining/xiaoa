import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { app } from "electron";
import type { z } from "zod";
import type { skillSchema } from "./schemas";

type Skill = z.infer<typeof skillSchema>;

interface ParsedSkillMarkdown {
  name?: string;
  description?: string;
  icon?: string;
  argumentHint?: string;
  prompt: string;
}

const FRONTMATTER_START = "---";
const FRONTMATTER_END = "\n---";

function getWorkspacesRoot(): string {
  return join(app.getPath("userData"), "workspaces");
}

function getSkillsDir(workspaceId: string): string {
  return join(getWorkspacesRoot(), workspaceId, "skills");
}

function getSkillPath(workspaceId: string, skillId: string): string {
  return join(getSkillsDir(workspaceId), `${skillId}.json`);
}

function getSkillReferencesDir(workspaceId: string, skillId: string): string {
  return join(getSkillsDir(workspaceId), "_references", skillId);
}

function ensureSkillsDir(workspaceId: string): void {
  const dir = getSkillsDir(workspaceId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseSkillMarkdown(content: string): ParsedSkillMarkdown {
  if (!content.startsWith(FRONTMATTER_START)) {
    return { prompt: content.trim() };
  }

  const endIndex = content.indexOf(FRONTMATTER_END, FRONTMATTER_START.length);
  if (endIndex === -1) {
    return { prompt: content.trim() };
  }

  const frontmatter = content.slice(FRONTMATTER_START.length, endIndex + 1);
  const body = content.slice(endIndex + FRONTMATTER_END.length).trim();
  const parsed: ParsedSkillMarkdown = { prompt: body };

  for (const line of frontmatter.split("\n")) {
    const [keyPart, ...rest] = line.split(":");
    const key = keyPart?.trim();
    const value = rest.join(":").trim();
    if (!(key && value)) {
      continue;
    }
    const normalized = value.replace(/^['"]|['"]$/g, "");
    if (key === "name") {
      parsed.name = normalized;
    } else if (key === "description") {
      parsed.description = normalized;
    } else if (key === "icon") {
      parsed.icon = normalized;
    } else if (key === "argument-hint") {
      parsed.argumentHint = normalized;
    }
  }

  return parsed;
}

function buildSkillMarkdown(skill: Skill): string {
  const frontmatter: string[] = [
    "---",
    `name: ${skill.name}`,
    `description: ${skill.description || ""}`,
  ];
  if (skill.icon) {
    frontmatter.push(`icon: ${skill.icon}`);
  }
  if (skill.argumentHint) {
    frontmatter.push(`argument-hint: ${skill.argumentHint}`);
  }
  frontmatter.push("---");
  return `${frontmatter.join("\n")}\n\n${skill.prompt}\n`;
}

function listReferenceFiles(dir: string, baseDir = dir): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listReferenceFiles(fullPath, baseDir));
    } else {
      files.push(relative(baseDir, fullPath));
    }
  }
  return files;
}

function toSkillWithReferences(skill: Skill): Skill {
  const refsDir = getSkillReferencesDir(skill.workspaceId, skill.id);
  const references = listReferenceFiles(refsDir).map((path) => ({
    name: basename(path),
    path,
  }));
  return {
    ...skill,
    references,
  };
}

export function listSkills(workspaceId: string): Skill[] {
  const dir = getSkillsDir(workspaceId);
  if (!existsSync(dir)) {
    return [];
  }

  const skills: Skill[] = [];
  const files = readdirSync(dir);

  for (const file of files) {
    if (!file.endsWith(".json")) {
      continue;
    }
    try {
      const content = readFileSync(join(dir, file), "utf-8");
      skills.push(toSkillWithReferences(JSON.parse(content) as Skill));
    } catch {
      // Ignore malformed files.
    }
  }

  return skills.sort((a, b) => a.createdAt - b.createdAt);
}

export function getSkill(workspaceId: string, id: string): Skill | null {
  const skillPath = getSkillPath(workspaceId, id);
  if (!existsSync(skillPath)) {
    return null;
  }

  try {
    const content = readFileSync(skillPath, "utf-8");
    return toSkillWithReferences(JSON.parse(content) as Skill);
  } catch {
    return null;
  }
}

export function createSkill(
  workspaceId: string,
  name: string,
  prompt: string,
  description?: string,
  icon?: string,
  argumentHint?: string
): Skill {
  ensureSkillsDir(workspaceId);

  const id = generateId();
  const now = Date.now();
  const skill: Skill = {
    id,
    workspaceId,
    name,
    description: description ?? "",
    icon,
    argumentHint,
    prompt,
    references: [],
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };

  writeFileSync(
    getSkillPath(workspaceId, id),
    JSON.stringify(skill, null, 2),
    "utf-8"
  );
  return skill;
}

export function updateSkill(
  workspaceId: string,
  id: string,
  updates: {
    name?: string;
    description?: string;
    icon?: string;
    argumentHint?: string;
    prompt?: string;
    enabled?: boolean;
  }
): Skill | null {
  const skill = getSkill(workspaceId, id);
  if (!skill) {
    return null;
  }

  const updated: Skill = {
    ...skill,
    name: updates.name ?? skill.name,
    description: updates.description ?? skill.description,
    icon: updates.icon ?? skill.icon,
    argumentHint: updates.argumentHint ?? skill.argumentHint,
    prompt: updates.prompt ?? skill.prompt,
    enabled: updates.enabled ?? skill.enabled,
    updatedAt: Date.now(),
  };

  writeFileSync(
    getSkillPath(workspaceId, id),
    JSON.stringify(updated, null, 2),
    "utf-8"
  );
  return toSkillWithReferences(updated);
}

export function deleteSkill(workspaceId: string, id: string): boolean {
  const skillPath = getSkillPath(workspaceId, id);
  if (!existsSync(skillPath)) {
    return false;
  }

  try {
    unlinkSync(skillPath);
    const refsDir = getSkillReferencesDir(workspaceId, id);
    if (existsSync(refsDir)) {
      rmSync(refsDir, { recursive: true, force: true });
    }
    return true;
  } catch {
    return false;
  }
}

function copyReferenceFiles(
  workspaceId: string,
  skillId: string,
  filePaths: string[]
): Skill["references"] {
  const refsDir = getSkillReferencesDir(workspaceId, skillId);
  mkdirSync(refsDir, { recursive: true });
  for (const filePath of filePaths) {
    const target = join(refsDir, basename(filePath));
    copyFileSync(filePath, target);
  }
  return listReferenceFiles(refsDir).map((path) => ({
    name: basename(path),
    path,
  }));
}

export function addSkillReferences(
  workspaceId: string,
  id: string,
  filePaths: string[]
): Skill | null {
  const skill = getSkill(workspaceId, id);
  if (!skill) {
    return null;
  }
  const references = copyReferenceFiles(workspaceId, id, filePaths);
  const updated: Skill = {
    ...skill,
    references,
    updatedAt: Date.now(),
  };
  writeFileSync(
    getSkillPath(workspaceId, id),
    JSON.stringify(updated, null, 2),
    "utf-8"
  );
  return updated;
}

export function importSkillFromDir(
  workspaceId: string,
  dirPath: string
): Skill {
  const skillFilePath = join(dirPath, "SKILL.md");
  const raw = readFileSync(skillFilePath, "utf-8");
  const parsed = parseSkillMarkdown(raw);
  const fallbackName = basename(dirPath);

  const skill = createSkill(
    workspaceId,
    parsed.name || fallbackName,
    parsed.prompt || "",
    parsed.description || "",
    parsed.icon,
    parsed.argumentHint
  );

  const referencesDir = join(dirPath, "references");
  if (existsSync(referencesDir)) {
    const refs = listReferenceFiles(referencesDir).map((path) =>
      join(referencesDir, path)
    );
    if (refs.length > 0) {
      return addSkillReferences(workspaceId, skill.id, refs) ?? skill;
    }
  }

  return skill;
}

export function exportSkillToDir(
  workspaceId: string,
  id: string,
  targetDir: string
): { path: string } | null {
  const skill = getSkill(workspaceId, id);
  if (!skill) {
    return null;
  }

  const outDir = join(targetDir, skill.name);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "SKILL.md"), buildSkillMarkdown(skill), "utf-8");

  if (skill.references && skill.references.length > 0) {
    const refsOutDir = join(outDir, "references");
    mkdirSync(refsOutDir, { recursive: true });
    const refsSrcDir = getSkillReferencesDir(workspaceId, id);
    for (const ref of skill.references) {
      const src = join(refsSrcDir, ref.path);
      const dest = join(refsOutDir, ref.path);
      mkdirSync(dirname(dest), { recursive: true });
      if (existsSync(src)) {
        copyFileSync(src, dest);
      }
    }
  }

  return { path: outDir };
}
