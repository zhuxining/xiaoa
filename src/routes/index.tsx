import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  abortChat,
  type ChatEvent,
  getChatEvents,
  respondChatPermission,
  sendChat,
} from "@/actions/chat";
import { getConfig, updateLLMConfig } from "@/actions/config";
import {
  createSession,
  deleteSession,
  getSessionMessages,
  listSessions,
} from "@/actions/session";
import { ChatView } from "@/components/chat/chat-view";
import type { PermissionRequest } from "@/components/chat/permission-dialog";
import { getModelName, type ModelInfo } from "@/constants/models";

/**
 * 处理 ChatEvent，更新消息状态
 */
function applyHomeChatEvent(
  event: ChatEvent,
  callbacks: {
    onDelta: (delta: string) => void;
    onPermissionRequest: (event: ChatEvent) => void;
    onReset: () => void;
    onToolEnd: () => void;
  }
): void {
  const { onDelta, onPermissionRequest, onReset, onToolEnd } = callbacks;

  switch (event.type) {
    case "message_start":
      onReset();
      break;

    case "message_delta":
      if (event.content) {
        onDelta(event.content);
      }
      break;

    case "message_end":
      break;

    case "tool_start":
    case "tool_call":
      break;

    case "tool_end":
    case "tool_result":
      onToolEnd();
      break;

    case "compaction":
      console.log(
        `[compaction] messages: ${event.messagesBefore} -> ${event.messagesAfter}`
      );
      break;

    case "permission_request":
      onPermissionRequest(event);
      break;

    case "permission_resolved":
      onToolEnd();
      break;

    case "run_error":
      onToolEnd();
      console.error("[run_error]", event.error);
      break;

    case "run_end":
    case "run_aborted":
      break;

    default:
      break;
  }
}

function HomePage() {
  const queryClient = useQueryClient();

  // 获取配置（包含当前模型信息）
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: getConfig,
  });

  // 当前模型信息
  const currentModel = config?.llm
    ? {
        id: config.llm.model,
        name: getModelName(config.llm.model),
        provider: config.llm.provider,
      }
    : null;

  // 模型变更处理
  const handleModelChange = useCallback(
    async (model: ModelInfo) => {
      await updateLLMConfig({ model: model.id });
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
    [queryClient]
  );

  // 使用新的 session IPC
  const {
    data: sessionsData = [],
    refetch: refetchSessionList,
  } = useQuery({
    queryKey: ["session", "global", "list"],
    queryFn: () => listSessions({ workspaceId: null }),
  });

  const sessions = sessionsData.map((s) => ({
    id: s.id,
    title: s.title,
    updatedAt: new Date(s.updatedAt),
    messageCount: s.messageCount,
  }));

  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    if (!currentSessionId && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [currentSessionId, sessions]);

  // 使用新的 session IPC 获取消息（直接返回 AgentMessage[]）
  const { data: messages = [] } = useQuery({
    queryKey: ["session", "global", "messages", currentSessionId],
    queryFn: () =>
      currentSessionId
        ? getSessionMessages({
            workspaceId: null,
            sessionId: currentSessionId,
          })
        : [],
    enabled: !!currentSessionId,
  });

  const createSessionMutation = useMutation({
    mutationFn: () => createSession({ workspaceId: null }),
    onSuccess: async (newSession) => {
      // 使用 refetch 确保立即同步获取最新列表
      await refetchSessionList();
      setCurrentSessionId(newSession.id);
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) =>
      deleteSession({ workspaceId: null, id: sessionId }),
    onSuccess: async (_, sessionId) => {
      // 使用 refetch 确保立即同步获取最新列表
      await refetchSessionList();
      if (currentSessionId === sessionId) {
        const next = sessions.find((s) => s.id !== sessionId);
        setCurrentSessionId(next?.id);
      }
    },
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [eventCursor, setEventCursor] = useState(0);
  const [permissionRequest, setPermissionRequest] =
    useState<PermissionRequest | null>(null);

  // 流式消息
  const streamingMessage: AgentMessage | null =
    isGenerating && streamingContent
      ? {
          role: "assistant",
          content: [{ type: "text", text: streamingContent }],
          timestamp: Date.now(),
          api: "openai-completions" as const,
          provider: "openai" as const,
          model: "streaming",
          usage: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 0,
            cost: {
              input: 0,
              output: 0,
              cacheRead: 0,
              cacheWrite: 0,
              total: 0,
            },
          },
          stopReason: "stop" as const,
        }
      : null;

  useEffect(() => {
    if (!currentSessionId) {
      setStreamingContent("");
      setIsGenerating(false);
      setActiveRunId(null);
      setEventCursor(0);
      setPermissionRequest(null);
      return;
    }

    setStreamingContent("");
    setIsGenerating(false);
    setActiveRunId(null);
    setEventCursor(0);
    setPermissionRequest(null);
  }, [currentSessionId]);

  const sendChatMutation = useMutation({
    mutationFn: sendChat,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["session", "global", "messages", currentSessionId],
      });
      // 延迟刷新列表，确保文件写入完成
      setTimeout(() => {
        refetchSessionList();
      }, 100);
    },
    onError: (error) => {
      setIsGenerating(false);
      setStreamingContent("");
      setActiveRunId(null);
      setPermissionRequest(null);
      console.error(error);
    },
  });

  const { data: eventResult } = useQuery({
    queryKey: [
      "chat",
      "events",
      "global",
      currentSessionId,
      eventCursor,
      activeRunId,
    ],
    queryFn: () =>
      currentSessionId
        ? getChatEvents({
            scope: "global",
            sessionId: currentSessionId,
            afterSeq: eventCursor,
          })
        : {
            events: [],
            lastSeq: eventCursor,
            running: false,
            runId: null,
          },
    enabled: !!currentSessionId && isGenerating && !!activeRunId,
    refetchInterval: isGenerating && !!activeRunId ? 250 : false,
  });

  useEffect(() => {
    if (!eventResult) {
      return;
    }

    if (eventResult.lastSeq > eventCursor) {
      setEventCursor(eventResult.lastSeq);
    }

    for (const event of eventResult.events) {
      applyHomeChatEvent(event, {
        onDelta: (delta) => setStreamingContent((prev) => prev + delta),
        onReset: () => setStreamingContent(""),
        onPermissionRequest: (permissionEvent) => {
          setPermissionRequest({
            id: permissionEvent.permissionId ?? `perm-${permissionEvent.seq}`,
            type: permissionEvent.permissionType ?? "execute",
            title: permissionEvent.permissionTitle ?? "权限确认",
            description:
              permissionEvent.permissionDescription ?? "Agent 请求执行操作",
            details: permissionEvent.permissionDetails,
            risk: permissionEvent.permissionRisk,
          });
        },
        onToolEnd: () => setPermissionRequest(null),
      });
    }

    if (!eventResult.running) {
      setIsGenerating(false);
      setStreamingContent("");
      setActiveRunId(null);
      setPermissionRequest(null);
      queryClient.invalidateQueries({
        queryKey: ["session", "global", "messages", currentSessionId],
      });
      // 延迟刷新列表，确保文件写入完成
      setTimeout(() => {
        refetchSessionList();
      }, 100);
    }
  }, [currentSessionId, eventCursor, eventResult, queryClient, refetchSessionList]);

  const handleSessionSelect = useCallback((id: string) => {
    setCurrentSessionId(id);
  }, []);

  const handleSessionCreate = useCallback(() => {
    createSessionMutation.mutate();
  }, [createSessionMutation]);

  const handleSessionDelete = useCallback(
    (id: string) => {
      deleteSessionMutation.mutate(id);
    },
    [deleteSessionMutation]
  );

  const handleMessageSend = useCallback(
    (content: string) => {
      if (!currentSessionId) {
        return;
      }

      setIsGenerating(true);
      setStreamingContent("");
      sendChatMutation.mutate(
        {
          scope: "global",
          sessionId: currentSessionId,
          content,
        },
        {
          onSuccess: (result) => {
            setActiveRunId(result.runId);
          },
        }
      );
    },
    [currentSessionId, sendChatMutation]
  );

  const handleAbort = useCallback(() => {
    if (currentSessionId) {
      abortChat({
        scope: "global",
        sessionId: currentSessionId,
        runId: activeRunId ?? undefined,
      });
    }

    setIsGenerating(false);
    setStreamingContent("");
    setPermissionRequest(null);
    setActiveRunId(null);
  }, [activeRunId, currentSessionId]);

  const handlePermissionAllow = useCallback(
    (request: PermissionRequest) => {
      if (!(currentSessionId && activeRunId)) {
        setPermissionRequest(null);
        return;
      }
      respondChatPermission({
        scope: "global",
        sessionId: currentSessionId,
        runId: activeRunId,
        requestId: request.id,
        decision: "allow",
        alwaysAllowInSession: request.rememberInSession ?? false,
      });
      setPermissionRequest(null);
    },
    [activeRunId, currentSessionId]
  );

  const handlePermissionDeny = useCallback(
    (request: PermissionRequest) => {
      if (currentSessionId && activeRunId) {
        respondChatPermission({
          scope: "global",
          sessionId: currentSessionId,
          runId: activeRunId,
          requestId: request.id,
          decision: "deny",
        });
      }
      setPermissionRequest(null);
    },
    [activeRunId, currentSessionId]
  );

  return (
    <ChatView
      agentName="小A"
      currentModel={currentModel}
      currentSessionId={currentSessionId}
      isGenerating={isGenerating}
      messages={messages}
      onAbort={handleAbort}
      onMessageSend={handleMessageSend}
      onModelChange={handleModelChange}
      onPermissionAllow={handlePermissionAllow}
      onPermissionDeny={handlePermissionDeny}
      onSessionCreate={handleSessionCreate}
      onSessionDelete={handleSessionDelete}
      onSessionSelect={handleSessionSelect}
      permissionRequest={permissionRequest}
      sessions={sessions}
      streamingMessage={streamingMessage}
    />
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
