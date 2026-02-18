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

function applyHomeChatEvent(
  event: ChatEvent,
  onDelta: (delta: string) => void,
  onReset: () => void,
  onPermissionRequest: (event: ChatEvent) => void,
  onToolEnd: () => void
): void {
  if (event.type === "message_start") {
    onReset();
    return;
  }
  if (event.type === "message_delta") {
    onDelta(event.content ?? "");
    return;
  }
  if (event.type === "permission_request") {
    onPermissionRequest(event);
    return;
  }
  if (event.type === "permission_resolved") {
    onToolEnd();
    return;
  }
  if (event.type === "tool_end" || event.type === "run_error") {
    onToolEnd();
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

  const messages = messagesData.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: new Date(m.timestamp),
  }));

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

  const displayMessages =
    isGenerating && streamingContent
      ? [
          ...messages,
          {
            id: "streaming-assistant",
            role: "assistant" as const,
            content: streamingContent,
            createdAt: new Date(),
          },
        ]
      : messages;

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
    enabled: !!currentSessionId && isGenerating,
    refetchInterval: isGenerating ? 250 : false,
  });

  useEffect(() => {
    if (!eventResult) {
      return;
    }

    if (eventResult.lastSeq > eventCursor) {
      setEventCursor(eventResult.lastSeq);
    }

    for (const event of eventResult.events) {
      applyHomeChatEvent(
        event,
        (delta) => setStreamingContent((prev) => prev + delta),
        () => setStreamingContent(""),
        (permissionEvent) => {
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
        () => setPermissionRequest(null)
      );
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
      messages={displayMessages}
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
    />
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
