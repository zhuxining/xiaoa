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

describe("sisson workspace store", () => {
  beforeEach(() => {
    userDataPath = mkdtempSync(join(tmpdir(), "xiaoa-sisson-workspace-"));
  });

  afterEach(() => {
    if (userDataPath && existsSync(userDataPath)) {
      rmSync(userDataPath, { recursive: true, force: true });
    }
  });

  test("creates session with workspace agent snapshot and filters by project", async () => {
    const workspaceDir = join(userDataPath, "workspaces", "ws-1");
    const workspaceConfigPath = join(workspaceDir, "workspace.json");
    mkdirSync(workspaceDir, { recursive: true });

    writeFileSync(
      workspaceConfigPath,
      JSON.stringify({
        id: "ws-1",
        name: "Workspace 1",
        agent: {
          name: "Agent W1",
          model: "claude-sonnet-4-5-20250514",
          systemPrompt: "You are workspace one agent.",
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
      "utf-8"
    );

    const store = await import("@/ipc/sisson/workspace-store");

    const sessionA = store.createSession("ws-1", "会话 A", "project-a");
    const sessionB = store.createSession("ws-1", "会话 B", "project-b");

    expect(sessionA.workspaceId).toBe("ws-1");
    expect(sessionA.projectId).toBe("project-a");
    expect(sessionA.agentSnapshot?.name).toBe("Agent W1");

    const all = store.listSessions("ws-1");
    expect(all.length).toBe(2);

    const onlyProjectA = store.listSessions("ws-1", "project-a");
    expect(onlyProjectA).toHaveLength(1);
    expect(onlyProjectA[0].id).toBe(sessionA.id);

    const none = store.listSessions("ws-1", "missing-project");
    expect(none).toHaveLength(0);

    const addedUserMessage = store.addMessage(
      "ws-1",
      sessionA.id,
      "user",
      "hello"
    );
    expect(addedUserMessage).not.toBeNull();

    const messages = store.getMessages("ws-1", sessionA.id);
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("hello");

    const stats = store.getSessionStats("ws-1", sessionA.id);
    expect(stats?.messageCount).toBe(1);

    const sessionsDir = join(workspaceDir, "sessions");
    const indexContent = JSON.parse(
      readFileSync(join(sessionsDir, "index.json"), "utf-8")
    ) as Array<{ id: string }>;
    expect(indexContent.some((s) => s.id === sessionB.id)).toBe(true);
  });

  test("isolates sessions by workspace", async () => {
    const ws1Dir = join(userDataPath, "workspaces", "ws-1");
    const ws2Dir = join(userDataPath, "workspaces", "ws-2");
    mkdirSync(ws1Dir, { recursive: true });
    mkdirSync(ws2Dir, { recursive: true });

    writeFileSync(
      join(ws1Dir, "workspace.json"),
      JSON.stringify({
        id: "ws-1",
        name: "Workspace 1",
        agent: {
          name: "Agent W1",
          model: "gpt-4o",
          systemPrompt: "w1",
        },
        createdAt: 1,
        updatedAt: 1,
      }),
      "utf-8"
    );

    writeFileSync(
      join(ws2Dir, "workspace.json"),
      JSON.stringify({
        id: "ws-2",
        name: "Workspace 2",
        agent: {
          name: "Agent W2",
          model: "gpt-4o-mini",
          systemPrompt: "w2",
        },
        createdAt: 1,
        updatedAt: 1,
      }),
      "utf-8"
    );

    const store = await import("@/ipc/sisson/workspace-store");

    const ws1Session = store.createSession("ws-1", "S1", "project-1");
    store.createSession("ws-2", "S2", "project-2");

    const ws1Sessions = store.listSessions("ws-1");
    const ws2Sessions = store.listSessions("ws-2");

    expect(ws1Sessions).toHaveLength(1);
    expect(ws1Sessions[0].id).toBe(ws1Session.id);
    expect(ws2Sessions).toHaveLength(1);
    expect(ws2Sessions[0].workspaceId).toBe("ws-2");
  });
});
