import { createFileRoute } from "@tanstack/react-router";
import { FileText, Globe, Wrench } from "lucide-react";
import { useState } from "react";
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
  const [sessions] = useState([
    {
      id: "1",
      title: "如何写一篇好文章",
      updatedAt: new Date(),
      messageCount: 5,
    },
    { id: "2", title: "数据分析入门", updatedAt: new Date(), messageCount: 3 },
  ]);
  const [currentSessionId, setCurrentSessionId] = useState("1");
  const [messages, setMessages] = useState([
    {
      id: "1",
      role: "user" as const,
      content: "你好，小A！",
      createdAt: new Date(),
    },
    {
      id: "2",
      role: "assistant" as const,
      content:
        "你好！我是小A，很高兴为您服务。有什么我可以帮助您的吗？\n\n提示：输入 / 可以快速调用技能",
      createdAt: new Date(),
    },
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [permissionRequest, setPermissionRequest] =
    useState<PermissionRequest | null>(null);

  const handleSessionSelect = (id: string) => {
    setCurrentSessionId(id);
  };

  const handleSessionCreate = () => {
    // TODO: 实现创建会话逻辑
  };

  const handleMessageSend = (content: string) => {
    const newMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);

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
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: "这是一个模拟的响应。实际的 Agent 集成将在后续实现。",
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsGenerating(false);
    }, 1000);
  };

  const handleAbort = () => {
    setIsGenerating(false);
  };

  const handleSkillSelect = (skill: SkillMenuItem) => {
    console.log("Selected skill:", skill);
  };

  const handlePermissionAllow = (request: PermissionRequest) => {
    console.log("Permission allowed:", request);
    setPermissionRequest(null);

    // 模拟执行操作后的响应
    const assistantMessage = {
      id: Date.now().toString(),
      role: "assistant" as const,
      content: `已获授权执行 ${request.title}。正在处理...`,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);
  };

  const handlePermissionDeny = (request: PermissionRequest) => {
    console.log("Permission denied:", request);
    setPermissionRequest(null);

    const assistantMessage = {
      id: Date.now().toString(),
      role: "assistant" as const,
      content: `操作被拒绝：${request.title}`,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);
  };

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
