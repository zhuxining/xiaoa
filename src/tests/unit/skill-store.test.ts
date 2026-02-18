import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

let userDataPath = "";

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => userDataPath),
  },
}));

describe("skill store", () => {
  beforeEach(() => {
    userDataPath = mkdtempSync(join(tmpdir(), "xiaoa-skill-store-"));
  });

  afterEach(() => {
    if (userDataPath && existsSync(userDataPath)) {
      rmSync(userDataPath, { recursive: true, force: true });
    }
  });

  test("imports skill from SKILL.md directory with references", async () => {
    const store = await import("@/ipc/skill/store");
    const workspaceId = "ws-skill-import";

    const importDir = join(userDataPath, "import-skill");
    mkdirSync(join(importDir, "references"), { recursive: true });
    writeFileSync(
      join(importDir, "SKILL.md"),
      `---
name: rewrite
description: 调整文本风格
icon: ✏️
argument-hint: [风格] [文本]
---

你是一位专业的文本编辑。`,
      "utf-8"
    );
    writeFileSync(
      join(importDir, "references", "guide.md"),
      "# style guide",
      "utf-8"
    );

    const skill = store.importSkillFromDir(workspaceId, importDir);
    expect(skill.name).toBe("rewrite");
    expect(skill.icon).toBe("✏️");
    expect(skill.argumentHint).toBe("[风格] [文本]");
    expect(skill.references?.some((ref) => ref.path === "guide.md")).toBe(true);
  });

  test("exports skill to directory with SKILL.md and references", async () => {
    const store = await import("@/ipc/skill/store");
    const workspaceId = "ws-skill-export";
    const skill = store.createSkill(
      workspaceId,
      "summarize",
      "请总结文本",
      "文档总结",
      "📝",
      "[文本]"
    );

    const refFile = join(userDataPath, "ref-1.txt");
    writeFileSync(refFile, "reference", "utf-8");
    store.addSkillReferences(workspaceId, skill.id, [refFile]);

    const outRoot = join(userDataPath, "exports");
    mkdirSync(outRoot, { recursive: true });
    const result = store.exportSkillToDir(workspaceId, skill.id, outRoot);
    expect(result).not.toBeNull();

    const skillMdPath = join(result?.path || "", "SKILL.md");
    const refPath = join(result?.path || "", "references", "ref-1.txt");
    expect(existsSync(skillMdPath)).toBe(true);
    expect(readFileSync(skillMdPath, "utf-8")).toContain(
      "argument-hint: [文本]"
    );
    expect(existsSync(refPath)).toBe(true);
  });
});
