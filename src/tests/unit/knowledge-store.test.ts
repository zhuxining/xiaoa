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

async function waitFor(
  check: () => boolean,
  timeoutMs = 3000,
  intervalMs = 30
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (check()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("timeout");
}

describe("knowledge store", () => {
  beforeEach(() => {
    userDataPath = mkdtempSync(join(tmpdir(), "xiaoa-knowledge-"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (userDataPath && existsSync(userDataPath)) {
      rmSync(userDataPath, { recursive: true, force: true });
    }
  });

  test("parses local markdown and generates parsed markdown file", async () => {
    const workspaceId = "ws-local";
    const sourcePath = join(userDataPath, "note.md");
    writeFileSync(sourcePath, "# Title\n\nHello knowledge", "utf-8");

    const store = await import("@/ipc/knowledge/store");
    const item = store.addKnowledge({
      workspaceId,
      name: "note.md",
      sourceType: "local",
      originalPath: sourcePath,
    });

    await waitFor(() => {
      const current = store
        .listKnowledge(workspaceId)
        .find((entry) => entry.id === item.id);
      return current?.status === "ready";
    });

    const ready = store
      .listKnowledge(workspaceId)
      .find((entry) => entry.id === item.id);
    expect(ready?.parsedFile).toBe(`${item.id}.md`);

    const parsedPath = join(
      userDataPath,
      "workspaces",
      workspaceId,
      "knowledge",
      `${item.id}.md`
    );
    expect(existsSync(parsedPath)).toBe(true);
    const parsed = readFileSync(parsedPath, "utf-8");
    expect(parsed).toContain("description:");
    expect(parsed).toContain("Hello knowledge");
  });

  test("parses URL content and writes frontmatter", async () => {
    const workspaceId = "ws-url";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () =>
          "<html><head><title>Example</title></head><body><h1>Header</h1><p>Body text</p></body></html>",
      }))
    );

    const store = await import("@/ipc/knowledge/store");
    const item = store.addKnowledge({
      workspaceId,
      name: "example",
      sourceType: "url",
      originalUrl: "https://example.com",
    });

    await waitFor(() => {
      const current = store
        .listKnowledge(workspaceId)
        .find((entry) => entry.id === item.id);
      return current?.status === "ready";
    });

    const content = store.getKnowledgeContent(workspaceId, item.id);
    expect(content?.content).toContain("Example");
    expect(content?.content).toContain('sourceType: "url"');
    expect(content?.content).toContain("description:");
  });

  test("marks unsupported local format as error and supports reparse", async () => {
    const workspaceId = "ws-unsupported";
    const sourcePath = join(userDataPath, "file.pdf");
    writeFileSync(sourcePath, "fake pdf bytes", "utf-8");

    const store = await import("@/ipc/knowledge/store");
    const item = store.addKnowledge({
      workspaceId,
      name: "file.pdf",
      sourceType: "local",
      originalPath: sourcePath,
    });

    await waitFor(() => {
      const current = store
        .listKnowledge(workspaceId)
        .find((entry) => entry.id === item.id);
      return current?.status === "error";
    });

    const failed = store
      .listKnowledge(workspaceId)
      .find((entry) => entry.id === item.id);
    expect(failed?.error).toContain("仅支持 txt/md/url");

    const reparsed = store.reparseKnowledge(workspaceId, item.id);
    expect(reparsed?.status).toBe("pending");
  });

  test("migrates legacy index fields while listing", async () => {
    const workspaceId = "ws-migrate";
    const knowledgeDir = join(
      userDataPath,
      "workspaces",
      workspaceId,
      "knowledge"
    );
    mkdirSync(knowledgeDir, { recursive: true });
    writeFileSync(
      join(knowledgeDir, "index.json"),
      JSON.stringify([
        {
          id: "legacy-1",
          workspaceId,
          name: "legacy",
          type: "url",
          source: "https://legacy.example",
          status: "pending",
          addedAt: 1,
        },
      ]),
      "utf-8"
    );

    const store = await import("@/ipc/knowledge/store");
    const items = store.listKnowledge(workspaceId);
    expect(items).toHaveLength(1);
    expect(items[0].sourceType).toBe("url");
    expect(items[0].originalUrl).toBe("https://legacy.example");
  });
});
