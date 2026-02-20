/**
 * skill/store.ts - 技能存储层（文件操作版本）
 *
 * 将技能存储在 ~/.xiaoa/agent/skills/<name>/SKILL.md 格式，
 * 以便 pi ResourceLoader 自动发现并注入 System Prompt。
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join, relative } from "node:path";
import { app } from "electron";
import type { z } from "zod";
import type { skillSchema } from "./schemas";

type Skill = z.infer<typeof skillSchema>;

interface ParsedSkillMarkdown {
  argumentHint?: string;
  description?: string;
  icon?: string;
  id?: string;
  name?: string;
  prompt: string;
}

const FRONTMATTER_START = "---";
const FRONTMATTER_END = "\n---";

/**
 * 获取 xiaoa agent 目录
 */
function getXiaoaAgentDir(): string {
  return join(app.getPath("userData"), "agent");
}

/**
 * 获取技能根目录 ~/.xiaoa/agent/skills/
 */
function getSkillsRootDir(): string {
  return join(getXiaoaAgentDir(), "skills");
}

/**
 * 获取技能目录 ~/.xiaoa/agent/skills/<name>/
 */
function getSkillDir(skillName: string): string {
  // 规范化名称：移除特殊字符，转小写
  const safeName = skillName
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5_-]/g, "-")
    .slice(0, 50);
  return join(getSkillsRootDir(), safeName);
}

/**
 * 获取 SKILL.md 文件路径
 */
function getSkillFilePath(skillDir: string): string {
  return join(skillDir, "SKILL.md");
}

/**
 * 获取参考资料目录
 */
function getReferencesDir(skillDir: string): string {
  return join(skillDir, "references");
}

/**
 * 确保目录存在
 */
function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 解析 SKILL.md 文件内容
 */
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
    } else if (key === "id") {
      // 保留 ID
      parsed.id = normalized;
    }
  }

  return parsed;
}

/**
 * 构建 SKILL.md 文件内容
 */
function buildSkillMarkdown(skill: Skill): string {
  const frontmatter: string[] = [
    "---",
    `id: ${skill.id}`,
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

/**
 * 列出参考文件
 */
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

/**
 * 读取技能（从目录名）
 */
function readSkillFromDir(skillDir: string): Skill | null {
  const skillFilePath = getSkillFilePath(skillDir);
  if (!existsSync(skillFilePath)) {
    return null;
  }

  try {
    const content = readFileSync(skillFilePath, "utf-8");
    const parsed = parseSkillMarkdown(content);
    const stat = statSync(skillFilePath);

    // 如果没有 ID，生成一个
    const id = parsed.id || generateId();

    // 获取参考文件
    const refsDir = getReferencesDir(skillDir);
    const references = listReferenceFiles(refsDir).map((path) => ({
      name: basename(path),
      path,
    }));

    return {
      id,
      workspaceId: "", // 全局技能，不绑定工作区
      name: parsed.name || basename(skillDir),
      description: parsed.description || "",
      icon: parsed.icon,
      argumentHint: parsed.argumentHint,
      prompt: parsed.prompt,
      references,
      enabled: true,
      createdAt: stat.birthtimeMs,
      updatedAt: stat.mtimeMs,
    };
  } catch {
    return null;
  }
}

/**
 * 列出所有技能
 *
 * 注意：新版本技能是全局的，不再绑定 workspaceId
 */
export function listSkills(_workspaceId: string): Skill[] {
  const skillsRoot = getSkillsRootDir();
  if (!existsSync(skillsRoot)) {
    return [];
  }

  const skills: Skill[] = [];
  const entries = readdirSync(skillsRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const skillDir = join(skillsRoot, entry.name);
    const skill = readSkillFromDir(skillDir);
    if (skill) {
      skills.push(skill);
    }
  }

  return skills.sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * 获取单个技能
 */
export function getSkill(_workspaceId: string, id: string): Skill | null {
  const skillsRoot = getSkillsRootDir();
  if (!existsSync(skillsRoot)) {
    return null;
  }

  // 遍历所有技能目录查找匹配的 ID
  const entries = readdirSync(skillsRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const skillDir = join(skillsRoot, entry.name);
    const skill = readSkillFromDir(skillDir);
    if (skill && skill.id === id) {
      return skill;
    }
  }

  return null;
}

/**
 * 创建技能
 */
export function createSkill(
  _workspaceId: string,
  name: string,
  prompt: string,
  description?: string,
  icon?: string,
  argumentHint?: string
): Skill {
  const skillsRoot = getSkillsRootDir();
  ensureDir(skillsRoot);

  const id = generateId();
  const skillDir = getSkillDir(name);
  ensureDir(skillDir);

  const now = Date.now();
  const skill: Skill = {
    id,
    workspaceId: "",
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

  // 写入 SKILL.md
  writeFileSync(getSkillFilePath(skillDir), buildSkillMarkdown(skill), "utf-8");

  return skill;
}

function maybeRenameSkillDir(
  skillDir: string,
  oldName: string,
  newName?: string
): string {
  if (!newName || newName === oldName) {
    return skillDir;
  }
  const newDir = getSkillDir(newName);
  if (skillDir === newDir) {
    return skillDir;
  }
  const { renameSync } = require("node:fs");
  try {
    renameSync(skillDir, newDir);
    return newDir;
  } catch {
    return skillDir;
  }
}

/**
 * 更新技能
 */
export function updateSkill(
  _workspaceId: string,
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
  const skill = getSkill("", id);
  if (!skill) {
    return null;
  }

  // 查找技能目录
  const skillsRoot = getSkillsRootDir();
  const entries = readdirSync(skillsRoot, { withFileTypes: true });
  let skillDir = "";
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const dir = join(skillsRoot, entry.name);
    const s = readSkillFromDir(dir);
    if (s && s.id === id) {
      skillDir = dir;
      break;
    }
  }

  if (!skillDir) {
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

  skillDir = maybeRenameSkillDir(skillDir, skill.name, updates.name);

  // 写入更新后的 SKILL.md
  writeFileSync(
    getSkillFilePath(skillDir),
    buildSkillMarkdown(updated),
    "utf-8"
  );

  // 获取参考文件
  const refsDir = getReferencesDir(skillDir);
  updated.references = listReferenceFiles(refsDir).map((path) => ({
    name: basename(path),
    path,
  }));

  return updated;
}

/**
 * 删除技能
 */
export function deleteSkill(_workspaceId: string, id: string): boolean {
  const skillsRoot = getSkillsRootDir();
  if (!existsSync(skillsRoot)) {
    return false;
  }

  // 查找技能目录
  const entries = readdirSync(skillsRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const skillDir = join(skillsRoot, entry.name);
    const skill = readSkillFromDir(skillDir);
    if (skill && skill.id === id) {
      rmSync(skillDir, { recursive: true, force: true });
      return true;
    }
  }

  return false;
}

/**
 * 添加技能参考资料
 */
export function addSkillReferences(
  _workspaceId: string,
  id: string,
  filePaths: string[]
): Skill | null {
  const skill = getSkill("", id);
  if (!skill) {
    return null;
  }

  // 查找技能目录
  const skillsRoot = getSkillsRootDir();
  const entries = readdirSync(skillsRoot, { withFileTypes: true });
  let skillDir = "";
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const dir = join(skillsRoot, entry.name);
    const s = readSkillFromDir(dir);
    if (s && s.id === id) {
      skillDir = dir;
      break;
    }
  }

  if (!skillDir) {
    return null;
  }

  // 复制文件到 references 目录
  const refsDir = getReferencesDir(skillDir);
  ensureDir(refsDir);

  const { copyFileSync } = require("node:fs");
  for (const filePath of filePaths) {
    const target = join(refsDir, basename(filePath));
    try {
      copyFileSync(filePath, target);
    } catch {
      // 忽略复制失败
    }
  }

  // 更新时间戳
  const updated: Skill = {
    ...skill,
    references: listReferenceFiles(refsDir).map((path) => ({
      name: basename(path),
      path,
    })),
    updatedAt: Date.now(),
  };

  writeFileSync(
    getSkillFilePath(skillDir),
    buildSkillMarkdown(updated),
    "utf-8"
  );

  return updated;
}

/**
 * 从目录导入技能
 */
export function importSkillFromDir(
  _workspaceId: string,
  dirPath: string
): Skill {
  const skillFilePath = join(dirPath, "SKILL.md");
  const raw = readFileSync(skillFilePath, "utf-8");
  const parsed = parseSkillMarkdown(raw);
  const fallbackName = basename(dirPath);

  const skill = createSkill(
    "",
    parsed.name || fallbackName,
    parsed.prompt || "",
    parsed.description || "",
    parsed.icon,
    parsed.argumentHint
  );

  // 导入参考资料
  const referencesDir = join(dirPath, "references");
  if (existsSync(referencesDir)) {
    const refs = listReferenceFiles(referencesDir).map((path) =>
      join(referencesDir, path)
    );
    if (refs.length > 0) {
      return addSkillReferences("", skill.id, refs) ?? skill;
    }
  }

  return skill;
}

/**
 * 导出技能到目录
 */
export function exportSkillToDir(
  _workspaceId: string,
  id: string,
  targetDir: string
): { path: string } | null {
  const skill = getSkill("", id);
  if (!skill) {
    return null;
  }

  const outDir = join(targetDir, skill.name);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "SKILL.md"), buildSkillMarkdown(skill), "utf-8");

  // 查找技能目录
  const skillsRoot = getSkillsRootDir();
  const entries = readdirSync(skillsRoot, { withFileTypes: true });
  let skillDir = "";
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const dir = join(skillsRoot, entry.name);
    const s = readSkillFromDir(dir);
    if (s && s.id === id) {
      skillDir = dir;
      break;
    }
  }

  // 导出参考资料
  if (skill.references && skill.references.length > 0 && skillDir) {
    const refsOutDir = join(outDir, "references");
    mkdirSync(refsOutDir, { recursive: true });
    const refsSrcDir = getReferencesDir(skillDir);
    const { copyFileSync, dirname } = require("node:fs");
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
