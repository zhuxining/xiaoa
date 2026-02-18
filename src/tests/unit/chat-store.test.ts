import {
  existsSync,
  mkdirSync,
  mkdtempSync,
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
  intervalMs = 20
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

describe("chat store", () => {
  beforeEach(() => {
    userDataPath = mkdtempSync(join(tmpdir(), "xiaoa-chat-"));
  });

  afterEach(() => {
    if (userDataPath && existsSync(userDataPath)) {
      rmSync(userDataPath, { recursive: true, force: true });
    }
  });

  test("streams and persists global assistant response", async () => {
    const globalStore = await import("@/ipc/sisson/global-store");
    const chatStore = await import("@/ipc/chat/store");

    const session = globalStore.createSession("global chat");
    chatStore.startChatRun({
      scope: "global",
      sessionId: session.id,
      content: "你好",
    });

    await waitFor(() => {
      const events = chatStore.getChatEvents({
        scope: "global",
        sessionId: session.id,
        afterSeq: 0,
      });
      return !events.running;
    });

    const messages = globalStore.getMessages(session.id);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("user");
    expect(messages[1].role).toBe("assistant");

    const eventResult = chatStore.getChatEvents({
      scope: "global",
      sessionId: session.id,
      afterSeq: 0,
    });
    expect(
      eventResult.events.some((event) => event.type === "message_delta")
    ).toBe(true);
    expect(eventResult.events.some((event) => event.type === "run_end")).toBe(
      true
    );
  });

  test("aborts workspace run without assistant persistence", async () => {
    const workspaceId = "ws-chat";
    const workspaceDir = join(userDataPath, "workspaces", workspaceId);
    mkdirSync(workspaceDir, { recursive: true });
    writeFileSync(
      join(workspaceDir, "workspace.json"),
      JSON.stringify({
        id: workspaceId,
        name: "Workspace",
        agent: {
          name: "Agent",
          model: "gpt-4o-mini",
          systemPrompt: "test",
        },
        createdAt: 1,
        updatedAt: 1,
      }),
      "utf-8"
    );

    const workspaceStore = await import("@/ipc/sisson/workspace-store");
    const chatStore = await import("@/ipc/chat/store");

    const session = workspaceStore.createSession(workspaceId, "workspace chat");
    const run = chatStore.startChatRun({
      scope: "workspace",
      workspaceId,
      sessionId: session.id,
      content: "请读取文件",
    });

    chatStore.abortChatRun({
      scope: "workspace",
      workspaceId,
      sessionId: session.id,
      runId: run.runId,
    });

    await waitFor(() => {
      const events = chatStore.getChatEvents({
        scope: "workspace",
        workspaceId,
        sessionId: session.id,
        afterSeq: 0,
      });
      return !events.running;
    });

    const messages = workspaceStore.getMessages(workspaceId, session.id);
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("user");

    const eventResult = chatStore.getChatEvents({
      scope: "workspace",
      workspaceId,
      sessionId: session.id,
      afterSeq: 0,
    });
    expect(
      eventResult.events.some((event) => event.type === "run_aborted")
    ).toBe(true);
  });

  test("review mode waits permission and can continue after allow", async () => {
    const workspaceId = "ws-review";
    const workspaceDir = join(userDataPath, "workspaces", workspaceId);
    mkdirSync(workspaceDir, { recursive: true });
    writeFileSync(
      join(workspaceDir, "workspace.json"),
      JSON.stringify({
        id: workspaceId,
        name: "Workspace",
        agent: {
          name: "Agent",
          model: "gpt-4o-mini",
          systemPrompt: "test",
        },
        permissions: {
          mode: "review",
          dangerousAutoConfirm: false,
        },
        createdAt: 1,
        updatedAt: 1,
      }),
      "utf-8"
    );

    const workspaceStore = await import("@/ipc/sisson/workspace-store");
    const chatStore = await import("@/ipc/chat/store");

    const session = workspaceStore.createSession(workspaceId, "workspace chat");
    const run = chatStore.startChatRun({
      scope: "workspace",
      workspaceId,
      sessionId: session.id,
      content: "请修改 README.md 并写入内容",
    });

    await waitFor(() => {
      const events = chatStore.getChatEvents({
        scope: "workspace",
        workspaceId,
        sessionId: session.id,
        afterSeq: 0,
      });
      return events.events.some((event) => event.type === "permission_request");
    });

    const pending = chatStore.getChatEvents({
      scope: "workspace",
      workspaceId,
      sessionId: session.id,
      afterSeq: 0,
    });
    const request = pending.events.find(
      (event) => event.type === "permission_request"
    );
    expect(request?.permissionType).toBe("file_write");

    const result = chatStore.respondChatPermission({
      scope: "workspace",
      workspaceId,
      sessionId: session.id,
      runId: run.runId,
      requestId: request?.permissionId ?? "",
      decision: "allow",
      alwaysAllowInSession: true,
    });
    expect(result.applied).toBe(true);

    await waitFor(() => {
      const events = chatStore.getChatEvents({
        scope: "workspace",
        workspaceId,
        sessionId: session.id,
        afterSeq: 0,
      });
      return !events.running;
    });

    const messages = workspaceStore.getMessages(workspaceId, session.id);
    expect(messages.some((message) => message.role === "assistant")).toBe(true);

    const afterFirst = chatStore.getChatEvents({
      scope: "workspace",
      workspaceId,
      sessionId: session.id,
      afterSeq: 0,
    });
    const firstLastSeq = afterFirst.lastSeq;

    chatStore.startChatRun({
      scope: "workspace",
      workspaceId,
      sessionId: session.id,
      content: "请再次修改 README.md 并写入内容",
    });

    await waitFor(() => {
      const events = chatStore.getChatEvents({
        scope: "workspace",
        workspaceId,
        sessionId: session.id,
        afterSeq: firstLastSeq,
      });
      return !events.running;
    });

    const secondEvents = chatStore.getChatEvents({
      scope: "workspace",
      workspaceId,
      sessionId: session.id,
      afterSeq: firstLastSeq,
    });
    expect(
      secondEvents.events.some((event) => event.type === "permission_request")
    ).toBe(false);
  });

  test("explore mode rejects dangerous operation", async () => {
    const workspaceId = "ws-explore";
    const workspaceDir = join(userDataPath, "workspaces", workspaceId);
    mkdirSync(workspaceDir, { recursive: true });
    writeFileSync(
      join(workspaceDir, "workspace.json"),
      JSON.stringify({
        id: workspaceId,
        name: "Workspace",
        agent: {
          name: "Agent",
          model: "gpt-4o-mini",
          systemPrompt: "test",
        },
        permissions: {
          mode: "explore",
          dangerousAutoConfirm: false,
        },
        createdAt: 1,
        updatedAt: 1,
      }),
      "utf-8"
    );

    const workspaceStore = await import("@/ipc/sisson/workspace-store");
    const chatStore = await import("@/ipc/chat/store");

    const session = workspaceStore.createSession(workspaceId, "workspace chat");
    chatStore.startChatRun({
      scope: "workspace",
      workspaceId,
      sessionId: session.id,
      content: "请执行 shell command 删除文件",
    });

    await waitFor(() => {
      const events = chatStore.getChatEvents({
        scope: "workspace",
        workspaceId,
        sessionId: session.id,
        afterSeq: 0,
      });
      return events.events.some((event) => event.type === "run_error");
    });

    const messages = workspaceStore.getMessages(workspaceId, session.id);
    expect(
      messages.filter((message) => message.role === "assistant")
    ).toHaveLength(0);
  });

  test("auto mode honors dangerousAutoConfirm switch", async () => {
    const workspaceId = "ws-auto";
    const workspaceDir = join(userDataPath, "workspaces", workspaceId);
    mkdirSync(workspaceDir, { recursive: true });
    writeFileSync(
      join(workspaceDir, "workspace.json"),
      JSON.stringify({
        id: workspaceId,
        name: "Workspace",
        agent: {
          name: "Agent",
          model: "gpt-4o-mini",
          systemPrompt: "test",
        },
        permissions: {
          mode: "auto",
          dangerousAutoConfirm: false,
        },
        createdAt: 1,
        updatedAt: 1,
      }),
      "utf-8"
    );

    const workspaceStore = await import("@/ipc/sisson/workspace-store");
    const chatStore = await import("@/ipc/chat/store");

    const session = workspaceStore.createSession(workspaceId, "workspace chat");
    const runA = chatStore.startChatRun({
      scope: "workspace",
      workspaceId,
      sessionId: session.id,
      content: "请写入文件",
    });

    await waitFor(() => {
      const events = chatStore.getChatEvents({
        scope: "workspace",
        workspaceId,
        sessionId: session.id,
        afterSeq: 0,
      });
      return events.events.some((event) => event.type === "permission_request");
    });

    const eventsA = chatStore.getChatEvents({
      scope: "workspace",
      workspaceId,
      sessionId: session.id,
      afterSeq: 0,
    });
    const requestA = eventsA.events.find(
      (event) => event.type === "permission_request"
    );
    chatStore.respondChatPermission({
      scope: "workspace",
      workspaceId,
      sessionId: session.id,
      runId: runA.runId,
      requestId: requestA?.permissionId ?? "",
      decision: "allow",
    });

    await waitFor(() => {
      const events = chatStore.getChatEvents({
        scope: "workspace",
        workspaceId,
        sessionId: session.id,
        afterSeq: 0,
      });
      return !events.running;
    });

    writeFileSync(
      join(workspaceDir, "workspace.json"),
      JSON.stringify({
        id: workspaceId,
        name: "Workspace",
        agent: {
          name: "Agent",
          model: "gpt-4o-mini",
          systemPrompt: "test",
        },
        permissions: {
          mode: "auto",
          dangerousAutoConfirm: true,
        },
        createdAt: 1,
        updatedAt: 2,
      }),
      "utf-8"
    );

    const beforeB = chatStore.getChatEvents({
      scope: "workspace",
      workspaceId,
      sessionId: session.id,
      afterSeq: 0,
    }).lastSeq;

    chatStore.startChatRun({
      scope: "workspace",
      workspaceId,
      sessionId: session.id,
      content: "请再次写入文件",
    });

    await waitFor(() => {
      const events = chatStore.getChatEvents({
        scope: "workspace",
        workspaceId,
        sessionId: session.id,
        afterSeq: beforeB,
      });
      return !events.running;
    });

    const eventsB = chatStore.getChatEvents({
      scope: "workspace",
      workspaceId,
      sessionId: session.id,
      afterSeq: beforeB,
    });
    expect(
      eventsB.events.some((event) => event.type === "permission_request")
    ).toBe(false);
  });
});
