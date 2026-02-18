import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { TextContent } from "@mariozechner/pi-ai";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Globe, Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  abortChat,
  type ChatEvent,
  getChatEvents,
  respondChatPermission,
  sendChat,
} from "@/actions/chat";
import { createSisson, getSissonMessages, listSissons } from "@/actions/sisson";
import { ChatView } from "@/components/chat/chat-view";
import type { PermissionRequest } from "@/components/chat/permission-dialog";
import type { SkillMenuItem } from "@/components/chat/skill-menu";

/**
 * 创建文本内容块
 */
function _textContent(text: string): TextContent {
  return { type: "text", text };
}

const SKILLS: SkillMenuItem[] = [
  {
    id: "web-search",
    name: "搜索网页",
    description: "搜索互联网获取最新信息",
    icon: <Globe className="size-3" />,
  },
  {
    id: "analyze-doc",
    name: "分析文档",
    description: "分析和总结文档内容",
    icon: <FileText className="size-3" />,
  },
  {
    id: "write-code",
    name: "编写代码",
    description: "生成代码片段",
    icon: <Wrench className="size-3" />,
  },
];

/**
 * 处理 ChatEvent，更新消息状态
 *
 * 支持 pi-agent-core 事件类型：
 * - message_start/message_delta/message_end: 文本流式输出
 * - tool_start/tool_end/tool_call/tool_result: 工具执行
 * - compaction: 上下文压缩
 * - permission_request/permission_resolved: 权限确认
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
      // 消息结束，等待下一轮
      break;

    case "tool_start":
    case "tool_call":
      // 工具开始/调用中，由 pi-web-ui MessageList 自动渲染
      break;

    case "tool_end":
    case "tool_result":
      onToolEnd();
      break;

    case "compaction":
      // 上下文压缩事件，记录日志
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
      // 运行结束/中止，由 eventResult.running 处理
      break;
  }
}

function HomePage() {
  const queryClient = useQueryClient();

  const { data: sessionsData = [] } = useQuery({
    queryKey: ["sisson", "global", "sessions"],
    queryFn: () => listSissons({ scope: "global" }),
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

  const { data: messagesData = [] } = useQuery({
    queryKey: ["sisson", "global", "messages", currentSessionId],
    queryFn: () =>
      currentSessionId
        ? getSissonMessages({
            scope: "global",
            sessionId: currentSessionId,
          })
        : [],
    enabled: !!currentSessionId,
  });

  // 转换为 AgentMessage[] 格式
  // UserMessage: content 可以是 string
  // AssistantMessage: content 必须是 TextContent[]，需要额外字段
  const messages: AgentMessage[] = messagesData.map((m) => {
    if (m.role === "user") {
      return {
        role: "user" as const,
        content: m.content,
        timestamp: m.timestamp,
      };
    }
    // assistant: 需要完整的 AssistantMessage 字段
    return {
      role: "assistant" as const,
      content: [{ type: "text" as const, text: m.content }],
      timestamp: m.timestamp,
      // 必需字段（历史消息用默认值）
      api: "openai-completions" as const,
      provider: "openai" as const,
      model: "unknown",
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
  });

  const createSessionMutation = useMutation({
    mutationFn: () => createSisson({ scope: "global" }),
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({
        queryKey: ["sisson", "global", "sessions"],
      });
      setCurrentSessionId(newSession.id);
    },
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [eventCursor, setEventCursor] = useState(0);
  const [permissionRequest, setPermissionRequest] =
    useState<PermissionRequest | null>(null);

  // 流式消息（AgentMessage 格式）
  // AssistantMessage: 需要完整的字段，但流式时 usage 等可能不完整
  const streamingMessage: AgentMessage | null =
    isGenerating && streamingContent
      ? {
          role: "assistant",
          content: [{ type: "text", text: streamingContent }],
          timestamp: Date.now(),
          // 流式消息的临时字段
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
        queryKey: ["sisson", "global", "messages", currentSessionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["sisson", "global", "sessions"],
      });
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
        queryKey: ["sisson", "global", "messages", currentSessionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["sisson", "global", "sessions"],
      });
    }
  }, [currentSessionId, eventCursor, eventResult, queryClient]);

  const handleSessionSelect = useCallback((id: string) => {
    setCurrentSessionId(id);
  }, []);

  const handleSessionCreate = useCallback(() => {
    createSessionMutation.mutate();
  }, [createSessionMutation]);

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

  const handleSkillSelect = useCallback((skill: SkillMenuItem) => {
    console.log("Selected skill:", skill);
  }, []);

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
      currentSessionId={currentSessionId}
      isGenerating={isGenerating}
      messages={messages}
      onAbort={handleAbort}
      onMessageSend={handleMessageSend}
      onPermissionAllow={handlePermissionAllow}
      onPermissionDeny={handlePermissionDeny}
      onSessionCreate={handleSessionCreate}
      onSessionSelect={handleSessionSelect}
      onSkillSelect={handleSkillSelect}
      permissionRequest={permissionRequest}
      sessions={sessions}
      skills={SKILLS}
      streamingMessage={streamingMessage}
    />
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
