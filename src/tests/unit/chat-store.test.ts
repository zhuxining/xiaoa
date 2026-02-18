import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
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

  test("explore mode allows read-only tools without extra permission", async () => {
    const workspaceId = "ws-explore-readonly";
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
      content: "请读取 README.md 内容并执行 memory_search 关键字",
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

    const events = chatStore.getChatEvents({
      scope: "workspace",
      workspaceId,
      sessionId: session.id,
      afterSeq: 0,
    });

    expect(
      events.events.some((event) => event.type === "permission_request")
    ).toBe(false);
  });

  test("fallback agent executes tools and emits tool events", async () => {
    const workspaceId = "ws-fallback-tools";
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
    chatStore.startChatRun({
      scope: "workspace",
      workspaceId,
      sessionId: session.id,
      content: "请列出当前目录文件",
    });

    await waitFor(() => {
      const result = chatStore.getChatEvents({
        scope: "workspace",
        workspaceId,
        sessionId: session.id,
        afterSeq: 0,
      });
      return !result.running;
    });

    const events = chatStore.getChatEvents({
      scope: "workspace",
      workspaceId,
      sessionId: session.id,
      afterSeq: 0,
    });

    expect(
      events.events.some(
        (event) => event.type === "tool_start" && event.toolName === "file_list"
      )
    ).toBe(true);
    expect(
      events.events.some(
        (event) => event.type === "tool_end" && event.toolName === "file_list"
      )
    ).toBe(true);

    const messages = workspaceStore.getMessages(workspaceId, session.id);
    expect(
      messages.some(
        (message) =>
          message.role === "assistant" &&
          typeof message.content === "string" &&
          message.content.includes("[file_list]")
      )
    ).toBe(true);
  });

  test("permission denial produces run_error and no assistant message", async () => {
    const workspaceId = "ws-permission-deny";
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
      content: "请写入文件并修改内容",
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

    chatStore.respondChatPermission({
      scope: "workspace",
      workspaceId,
      sessionId: session.id,
      runId: run.runId,
      requestId: request?.permissionId ?? "",
      decision: "deny",
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

    const events = chatStore.getChatEvents({
      scope: "workspace",
      workspaceId,
      sessionId: session.id,
      afterSeq: 0,
    });

    const errorEvent = events.events.find(
      (event) => event.type === "run_error"
    );
    expect(errorEvent?.error).toBe("用户拒绝权限请求");

    const messages = workspaceStore.getMessages(workspaceId, session.id);
    expect(
      messages.filter((message) => message.role === "assistant")
    ).toHaveLength(0);
  });

  test("maybeCompactMessages compacts history and writes daily log", async () => {
    const workspaceId = "ws-compaction";
    const workspaceDir = join(userDataPath, "workspaces", workspaceId);
    mkdirSync(workspaceDir, { recursive: true });

    const chatStore = await import("@/ipc/chat/store");
    const { __test } = chatStore as unknown as {
      __test: {
        maybeCompactMessages: (
          run: unknown,
          messages: Array<{
            role: string;
            content: unknown;
            timestamp: number;
          }>
        ) => Array<{ role: string; content: unknown; timestamp: number }>;
      };
    };

    const longText = "hello".repeat(4000);
    const messages = Array.from({ length: 5 }, () => ({
      role: "user",
      content: [{ type: "text", text: longText }],
      timestamp: Date.now(),
    }));

    const run = {
      runId: "run-compact",
      key: "workspace::ws-compaction:session-1",
      scope: "workspace" as const,
      workspaceId,
      sessionId: "session-1",
      content: "",
      aborted: false,
      pendingPermission: null,
      assistantBuffer: "",
    };

    const compacted = __test.maybeCompactMessages(run, messages);
    expect(compacted.length).toBeLessThan(messages.length);

    const summaryMessage = compacted.find(
      (message) =>
        typeof message.content === "string" &&
        (message.content as string).includes("历史上下文摘要（自动压缩）")
    );
    expect(summaryMessage).toBeDefined();

    const dailyDir = join(
      userDataPath,
      "workspaces",
      workspaceId,
      "memories",
      "daily"
    );
    expect(existsSync(dailyDir)).toBe(true);

    const files = readdirSync(dailyDir);
    expect(files.length).toBeGreaterThan(0);
    const logContent = readFileSync(join(dailyDir, files[0]), "utf-8");
    expect(logContent).toContain("## Pre-compaction flush");
    expect(logContent).toContain("user:");
  });

  test("handleAgentStreamEvent maps agent events to chat events", async () => {
    const workspaceId = "ws-agent-events";
    const chatStore = await import("@/ipc/chat/store");
    const { __test } = chatStore as unknown as {
      __test: {
        handleAgentStreamEvent: (run: any, event: unknown) => void;
      };
      getChatEvents: typeof import("@/ipc/chat/store")["getChatEvents"];
    };

    const run = {
      runId: "run-agent",
      key: "workspace:ws-agent-events:session-1",
      scope: "workspace" as const,
      workspaceId,
      sessionId: "session-1",
      content: "",
      aborted: false,
      pendingPermission: null,
      assistantBuffer: "",
    };

    __test.handleAgentStreamEvent(run, {
      type: "tool_execution_start",
      toolName: "file_read",
    });
    __test.handleAgentStreamEvent(run, {
      type: "message_update",
      assistantMessageEvent: { type: "text_delta", delta: "你好" },
    });
    __test.handleAgentStreamEvent(run, {
      type: "tool_execution_end",
      toolName: "file_read",
    });
    __test.handleAgentStreamEvent(run, {
      type: "message_end",
      message: { content: [{ type: "text", text: "完整回复" }] },
    });

    const events = chatStore.getChatEvents({
      scope: "workspace",
      workspaceId,
      sessionId: "session-1",
      afterSeq: 0,
    });

    expect(
      events.events.some(
        (event) => event.type === "tool_start" && event.toolName === "file_read"
      )
    ).toBe(true);
    expect(
      events.events.some(
        (event) => event.type === "tool_end" && event.toolName === "file_read"
      )
    ).toBe(true);
    expect(events.events.some((event) => event.type === "message_delta")).toBe(
      true
    );

    expect(run.assistantBuffer).toBe("完整回复");
  });
});
