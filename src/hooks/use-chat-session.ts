/**
 * useChatSession - 统一的会话/对话状态管理 Hook
 *
 * 封装会话 CRUD、消息获取、流式事件轮询、权限请求等全部逻辑，
 * 供 HomePage（global scope）和 ProjectPage（workspace scope）共用。
 */

import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  abortChat,
  type ChatEvent,
  type ChatScope,
  getChatEvents,
  respondChatPermission,
  sendChat,
} from "@/actions/chat";
import {
  createSession as createSessionAction,
  deleteSession as deleteSessionAction,
  getSessionMessages,
  listSessions,
  renameSession as renameSessionAction,
} from "@/actions/session";
import type { PermissionRequest } from "@/components/chat/permission-dialog";
import type { ChatSession } from "@/types/session";

// ─── Options & Return Types ─────────────────────────────────────

export interface UseChatSessionOptions {
  /** Session creation cwd (workspace scope) */
  cwd?: string;
  /** Initial session ID (e.g. from URL params) */
  initialSessionId?: string;
  /** Filter sessions by project path (workspace scope) */
  projectPath?: string;
  /** "global" or "workspace" */
  scope: ChatScope;
  /** null for global sessions */
  workspaceId: string | null;
  /** Root path passed to sendChat (workspace scope) */
  workspaceRootPath?: string;
}

export interface UseChatSessionReturn {
  abort: () => void;
  allowPermission: (request: PermissionRequest) => void;
  createSession: () => void;
  currentSessionId: string | undefined;
  deleteSession: (id: string) => void;
  denyPermission: (request: PermissionRequest) => void;

  isGenerating: boolean;

  messages: AgentMessage[];

  permissionRequest: PermissionRequest | null;
  renameSession: (id: string, name: string) => void;
  selectSession: (id: string) => void;
  sendMessage: (content: string) => void;
  sessions: ChatSession[];
  streamingMessage: AgentMessage | null;
}

// ─── Event Processor ────────────────────────────────────────────

function processChatEvent(
  event: ChatEvent,
  callbacks: {
    onDelta: (delta: string) => void;
    onPermissionRequest: (event: ChatEvent) => void;
    onPermissionResolved: () => void;
    onReset: () => void;
    onToolEnd: () => void;
  }
): void {
  switch (event.type) {
    case "message_start":
      callbacks.onReset();
      break;
    case "message_delta":
      if (event.content) {
        callbacks.onDelta(event.content);
      }
      break;
    case "message_end":
      break;
    case "tool_end":
    case "tool_result":
      callbacks.onToolEnd();
      break;
    case "permission_request":
      callbacks.onPermissionRequest(event);
      break;
    case "permission_resolved":
      callbacks.onPermissionResolved();
      break;
    case "run_error":
      callbacks.onToolEnd();
      break;
    default:
      break;
  }
}

// ─── Streaming Message Factory ──────────────────────────────────

function buildStreamingMessage(
  content: string,
  timestamp: number
): AgentMessage {
  return {
    role: "assistant",
    content: [{ type: "text", text: content }],
    timestamp,
    api: "openai-completions" as const,
    provider: "openai" as const,
    model: "streaming",
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
    stopReason: "stop" as const,
  };
}

// ─── Hook ───────────────────────────────────────────────────────

export function useChatSession(
  options: UseChatSessionOptions
): UseChatSessionReturn {
  const {
    scope,
    workspaceId,
    projectPath,
    cwd,
    workspaceRootPath,
    initialSessionId,
  } = options;

  // ── State ────────────────────────────────────────────────────
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(
    initialSessionId
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [permissionRequest, setPermissionRequest] =
    useState<PermissionRequest | null>(null);
  // 乐观更新：用户发送但服务器尚未确认的消息
  const [pendingUserMessage, setPendingUserMessage] =
    useState<AgentMessage | null>(null);
  // 保留最后的流式消息，避免刷新闪烁
  const [lastStreamingMessage, setLastStreamingMessage] =
    useState<AgentMessage | null>(null);

  // Use ref for event cursor to avoid queryKey churn
  const eventCursorRef = useRef(0);
  // Guard against concurrent auto-create
  const isCreatingRef = useRef(false);
  // 保存流式消息的开始时间戳，避免每次更新都刷新
  const streamingStartTimestampRef = useRef<number | null>(null);

  // ── Query Keys ───────────────────────────────────────────────
  const sessionsQueryKey = [
    "session",
    scope,
    workspaceId,
    "list",
    projectPath ?? null,
  ];
  const messagesQueryKey = [
    "session",
    scope,
    workspaceId,
    "messages",
    currentSessionId,
  ];
  const eventsQueryKey = [
    "chat",
    "events",
    scope,
    workspaceId,
    currentSessionId,
  ];

  // ── Sessions Query ───────────────────────────────────────────
  const { data: sessionsData = [], refetch: refetchSessionList } = useQuery({
    queryKey: sessionsQueryKey,
    queryFn: () =>
      listSessions({
        workspaceId,
        projectPath: projectPath ?? undefined,
      }),
    staleTime: 0,
  });

  const sessions: ChatSession[] = sessionsData.map((s) => ({
    id: s.id,
    title: s.title,
    updatedAt: new Date(s.updatedAt),
    messageCount: s.messageCount,
  }));

  // ── Messages Query ───────────────────────────────────────────
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: messagesQueryKey,
    queryFn: () =>
      currentSessionId
        ? getSessionMessages({ workspaceId, sessionId: currentSessionId })
        : [],
    enabled: !!currentSessionId,
    staleTime: 0,
  });

  // ── Auto-select first session ────────────────────────────────
  useEffect(() => {
    if (!currentSessionId && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [currentSessionId, sessions]);

  // ── Honor initialSessionId ───────────────────────────────────
  useEffect(() => {
    if (initialSessionId) {
      setCurrentSessionId(initialSessionId);
    }
  }, [initialSessionId]);

  // ── Reset state on session switch ────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on session change
  useEffect(() => {
    setStreamingContent("");
    setIsGenerating(false);
    setActiveRunId(null);
    eventCursorRef.current = 0;
    setPermissionRequest(null);
    setPendingUserMessage(null);
    setLastStreamingMessage(null);
  }, [currentSessionId]);

  // ── Event Polling ────────────────────────────────────────────
  const { data: eventResult } = useQuery({
    queryKey: eventsQueryKey,
    queryFn: () =>
      currentSessionId
        ? getChatEvents({
            scope,
            workspaceId: workspaceId ?? undefined,
            sessionId: currentSessionId,
            afterSeq: eventCursorRef.current,
          })
        : { events: [], lastSeq: 0, running: false, runId: null },
    enabled: !!currentSessionId && isGenerating && !!activeRunId,
    refetchInterval: isGenerating && !!activeRunId ? 250 : false,
    staleTime: 0,
  });

  // ── Process Events ───────────────────────────────────────────
  useEffect(() => {
    if (!eventResult) {
      return;
    }

    if (eventResult.lastSeq > eventCursorRef.current) {
      eventCursorRef.current = eventResult.lastSeq;
    }

    for (const event of eventResult.events) {
      processChatEvent(event, {
        onDelta: (delta) => {
          setStreamingContent((prev) => {
            const newContent = prev + delta;
            // 初始化开始时间戳（只在第一次）
            if (streamingStartTimestampRef.current === null) {
              streamingStartTimestampRef.current = Date.now();
            }
            // 使用固定的开始时间戳，避免每次更新都刷新
            setLastStreamingMessage(
              buildStreamingMessage(
                newContent,
                streamingStartTimestampRef.current
              )
            );
            return newContent;
          });
        },
        onReset: () => {
          setStreamingContent("");
          setLastStreamingMessage(null);
          streamingStartTimestampRef.current = null;
        },
        onPermissionRequest: (evt) => {
          setPermissionRequest({
            id: evt.permissionId ?? `perm-${evt.seq}`,
            type: evt.permissionType ?? "execute",
            title: evt.permissionTitle ?? "权限确认",
            description: evt.permissionDescription ?? "Agent 请求执行操作",
            details: evt.permissionDetails,
            risk: evt.permissionRisk,
          });
        },
        onPermissionResolved: () => setPermissionRequest(null),
        onToolEnd: () => setPermissionRequest(null),
      });
    }

    if (!eventResult.running && isGenerating) {
      setIsGenerating(false);
      setStreamingContent("");
      setActiveRunId(null);
      setPermissionRequest(null);
      // 注意：不清空 lastStreamingMessage，保留直到服务器消息刷新
      // Delay refetch to allow pi JSONL flush
      setTimeout(() => {
        refetchMessages();
        refetchSessionList();
        // 服务器消息已刷新，清除乐观更新的消息
        setPendingUserMessage(null);
        setLastStreamingMessage(null);
        streamingStartTimestampRef.current = null;
      }, 300);
    }
  }, [eventResult, isGenerating, refetchMessages, refetchSessionList]);

  // ── Streaming Message ────────────────────────────────────────
  // 生成中返回当前流式消息，否则返回保留的最后流式消息（避免刷新闪烁）
  const getStreamingMessage = (): AgentMessage | null => {
    if (!isGenerating) {
      return lastStreamingMessage;
    }
    if (streamingContent) {
      return buildStreamingMessage(
        streamingContent,
        streamingStartTimestampRef.current ?? Date.now()
      );
    }
    return lastStreamingMessage;
  };
  const streamingMessage = getStreamingMessage();

  // ── Combined Messages (with optimistic user message) ──────────
  const displayMessages: AgentMessage[] = pendingUserMessage
    ? [...messages, pendingUserMessage]
    : messages;

  // ── Create Session ───────────────────────────────────────────
  const createSessionMutation = useMutation({
    mutationFn: () =>
      createSessionAction({ workspaceId, cwd: cwd ?? undefined }),
    onSuccess: async (newSession) => {
      await refetchSessionList();
      setCurrentSessionId(newSession.id);
    },
  });

  // ── Delete Session ───────────────────────────────────────────
  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) =>
      deleteSessionAction({ workspaceId, id: sessionId }),
    onSuccess: async (_, sessionId) => {
      await refetchSessionList();
      if (currentSessionId === sessionId) {
        const next = sessions.find((s) => s.id !== sessionId);
        setCurrentSessionId(next?.id);
      }
    },
  });

  const renameSessionMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      renameSessionAction({ workspaceId, id, name }),
    onSuccess: async () => {
      await refetchSessionList();
    },
  });

  // ── Send Message ─────────────────────────────────────────────
  const sendMessage = useCallback(
    async (content: string) => {
      let sessionId = currentSessionId;

      // Auto-create session if none exists
      if (!sessionId) {
        if (isCreatingRef.current) {
          return;
        }
        isCreatingRef.current = true;
        try {
          const newSession = await createSessionAction({
            workspaceId,
            cwd: cwd ?? undefined,
          });
          sessionId = newSession.id;
          setCurrentSessionId(sessionId);
          await refetchSessionList();
        } finally {
          isCreatingRef.current = false;
        }
      }

      // 乐观更新：立即显示用户消息
      const optimisticUserMessage: AgentMessage = {
        role: "user",
        content: [{ type: "text", text: content }],
        timestamp: Date.now(),
      } as AgentMessage;
      setPendingUserMessage(optimisticUserMessage);

      setIsGenerating(true);
      setStreamingContent("");
      eventCursorRef.current = 0;

      try {
        const result = await sendChat({
          scope,
          workspaceId: workspaceId ?? undefined,
          sessionId,
          content,
          workspaceRootPath: workspaceRootPath ?? undefined,
        });
        setActiveRunId(result.runId);
      } catch (error) {
        setIsGenerating(false);
        setStreamingContent("");
        setActiveRunId(null);
        setPermissionRequest(null);
        setPendingUserMessage(null);
        console.error("[useChatSession] sendChat failed:", error);
      }
    },
    [
      currentSessionId,
      cwd,
      refetchSessionList,
      scope,
      workspaceId,
      workspaceRootPath,
    ]
  );

  // ── Abort ────────────────────────────────────────────────────
  const abort = useCallback(() => {
    if (currentSessionId) {
      abortChat({
        scope,
        workspaceId: workspaceId ?? undefined,
        sessionId: currentSessionId,
        runId: activeRunId ?? undefined,
      });
    }
    setIsGenerating(false);
    setStreamingContent("");
    setActiveRunId(null);
    setPermissionRequest(null);
  }, [activeRunId, currentSessionId, scope, workspaceId]);

  // ── Permission Handlers ──────────────────────────────────────
  const allowPermission = useCallback(
    (request: PermissionRequest) => {
      if (!(currentSessionId && activeRunId)) {
        setPermissionRequest(null);
        return;
      }
      respondChatPermission({
        scope,
        workspaceId: workspaceId ?? undefined,
        sessionId: currentSessionId,
        runId: activeRunId,
        requestId: request.id,
        decision: "allow",
        alwaysAllowInSession: request.rememberInSession ?? false,
      });
      setPermissionRequest(null);
    },
    [activeRunId, currentSessionId, scope, workspaceId]
  );

  const denyPermission = useCallback(
    (request: PermissionRequest) => {
      if (currentSessionId && activeRunId) {
        respondChatPermission({
          scope,
          workspaceId: workspaceId ?? undefined,
          sessionId: currentSessionId,
          runId: activeRunId,
          requestId: request.id,
          decision: "deny",
        });
      }
      setPermissionRequest(null);
    },
    [activeRunId, currentSessionId, scope, workspaceId]
  );

  // ── Return ───────────────────────────────────────────────────
  return {
    sessions,
    currentSessionId,
    selectSession: setCurrentSessionId,
    createSession: () => createSessionMutation.mutate(),
    deleteSession: (id: string) => deleteSessionMutation.mutate(id),
    renameSession: (id: string, name: string) =>
      renameSessionMutation.mutate({ id, name }),

    messages: displayMessages,
    streamingMessage,

    isGenerating,
    sendMessage,
    abort,

    permissionRequest,
    allowPermission,
    denyPermission,
  };
}
