import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Globe, Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  addSissonMessage,
  createSisson,
  getSissonMessages,
  listSissons,
} from "@/actions/sisson";
import { ChatView } from "@/components/chat/chat-view";
import type { PermissionRequest } from "@/components/chat/permission-dialog";
import type { SkillMenuItem } from "@/components/chat/skill-menu";

// 技能列表
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

function HomePage() {
  const queryClient = useQueryClient();

  // 获取会话列表
  const { data: sessionsData = [] } = useQuery({
    queryKey: ["sisson", "global", "sessions"],
    queryFn: () => listSissons({ scope: "global" }),
  });

  // 转换会话数据格式
  const sessions = sessionsData.map((s) => ({
    id: s.id,
    title: s.title,
    updatedAt: new Date(s.updatedAt),
    messageCount: s.messageCount,
  }));

  // 当前选中的会话 ID
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(
    undefined
  );

  // 如果没有选中会话且有会话列表，自动选中第一个
  useEffect(() => {
    if (!currentSessionId && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [currentSessionId, sessions]);

  // 获取当前会话的消息
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

  // 转换消息数据格式
  const messages = messagesData.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: new Date(m.timestamp),
  }));

  // 创建会话
  const createSessionMutation = useMutation({
    mutationFn: () => createSisson({ scope: "global" }),
    onSuccess: (newSession) => {
      // 刷新会话列表
      queryClient.invalidateQueries({
        queryKey: ["sisson", "global", "sessions"],
      });
      // 切换到新会话
      setCurrentSessionId(newSession.id);
    },
  });

  // 添加消息
  const addMessageMutation = useMutation({
    mutationFn: addSissonMessage,
    onSuccess: () => {
      // 刷新消息和会话列表
      queryClient.invalidateQueries({
        queryKey: ["sisson", "global", "messages", currentSessionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["sisson", "global", "sessions"],
      });
    },
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [permissionRequest, setPermissionRequest] =
    useState<PermissionRequest | null>(null);

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

      // 添加用户消息
      addMessageMutation.mutate({
        scope: "global",
        sessionId: currentSessionId,
        role: "user",
        content,
      });

      // 模拟 AI 响应
      setIsGenerating(true);

      // 模拟权限请求
      if (content.includes("搜索") || content.includes("网页")) {
        setTimeout(() => {
          setPermissionRequest({
            id: "perm-1",
            type: "network",
            title: "访问网络",
            description: "Agent 请求访问网络以搜索信息",
            details: `目标 URL: https://www.google.com/search?q=${encodeURIComponent(content)}`,
            risk: "medium",
          });
          setIsGenerating(false);
        }, 500);
        return;
      }

      setTimeout(() => {
        // 添加助手消息
        addMessageMutation.mutate({
          scope: "global",
          sessionId: currentSessionId,
          role: "assistant",
          content: "这是一个模拟的响应。实际的 Agent 集成将在后续实现。",
        });
        setIsGenerating(false);
      }, 1000);
    },
    [currentSessionId, addMessageMutation]
  );

  const handleAbort = useCallback(() => {
    setIsGenerating(false);
  }, []);

  const handleSkillSelect = useCallback((skill: SkillMenuItem) => {
    console.log("Selected skill:", skill);
  }, []);

  const handlePermissionAllow = useCallback(
    (request: PermissionRequest) => {
      console.log("Permission allowed:", request);
      setPermissionRequest(null);

      if (!currentSessionId) {
        return;
      }

      // 添加助手响应
      addMessageMutation.mutate({
        scope: "global",
        sessionId: currentSessionId,
        role: "assistant",
        content: `已获授权执行 ${request.title}。正在处理...`,
      });
    },
    [currentSessionId, addMessageMutation]
  );

  const handlePermissionDeny = useCallback(
    (request: PermissionRequest) => {
      console.log("Permission denied:", request);
      setPermissionRequest(null);

      if (!currentSessionId) {
        return;
      }

      // 添加助手响应
      addMessageMutation.mutate({
        scope: "global",
        sessionId: currentSessionId,
        role: "assistant",
        content: `操作被拒绝：${request.title}`,
      });
    },
    [currentSessionId, addMessageMutation]
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
    />
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
