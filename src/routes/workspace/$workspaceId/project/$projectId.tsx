// biome-ignore lint/style/useFilenamingConvention: TanStack Router requires $paramName format for route params
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import type { Message, Session } from "@/components/chat/chat-view";
import type { FileInfo } from "@/components/project/file-preview";
import type { FileNode } from "@/components/project/file-tree";
import { ProjectView } from "@/components/project/project-view";
import { PageHeader } from "@/components/shared/page-header";

// Mock data
const MOCK_FILES: FileNode[] = [
  {
    id: "src",
    name: "src",
    type: "folder",
    children: [
      {
        id: "components",
        name: "components",
        type: "folder",
        children: [
          { id: "App.tsx", name: "App.tsx", type: "file" },
          { id: "Header.tsx", name: "Header.tsx", type: "file" },
        ],
      },
      {
        id: "utils",
        name: "utils",
        type: "folder",
        children: [{ id: "helpers.ts", name: "helpers.ts", type: "file" }],
      },
      { id: "index.tsx", name: "index.tsx", type: "file" },
    ],
  },
  {
    id: "docs",
    name: "docs",
    type: "folder",
    children: [
      { id: "README.md", name: "README.md", type: "file" },
      { id: "API.md", name: "API.md", type: "file" },
    ],
  },
  { id: "package.json", name: "package.json", type: "file" },
  { id: "tsconfig.json", name: "tsconfig.json", type: "file" },
];

const MOCK_SESSIONS: Session[] = [
  { id: "1", title: "实现登录功能", updatedAt: new Date(), messageCount: 8 },
  { id: "2", title: "优化性能", updatedAt: new Date(), messageCount: 3 },
];

const MOCK_MESSAGES: Message[] = [
  {
    id: "1",
    role: "user",
    content: "帮我实现一个登录表单",
    createdAt: new Date(),
  },
  {
    id: "2",
    role: "assistant",
    content: "好的，我来帮你实现登录表单。首先需要创建一个表单组件...",
    createdAt: new Date(),
  },
];

const MOCK_FILE_CONTENTS: Record<string, FileInfo> = {
  "index.tsx": {
    id: "index.tsx",
    name: "index.tsx",
    path: "/src/index.tsx",
    type: "code",
    content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
    size: 245,
    lastModified: new Date(),
  },
  "package.json": {
    id: "package.json",
    name: "package.json",
    path: "/package.json",
    type: "code",
    content: `{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build"
  }
}`,
    size: 180,
    lastModified: new Date(),
  },
  "README.md": {
    id: "README.md",
    name: "README.md",
    path: "/docs/README.md",
    type: "text",
    content:
      "# 项目说明\n\n这是一个示例项目。\n\n## 快速开始\n\n```bash\nnpm install\nnpm run dev\n```",
    size: 120,
    lastModified: new Date(),
  },
};

function ProjectPage() {
  const { workspaceId, projectId } = Route.useParams();
  const search = useSearch({
    from: "/workspace/$workspaceId/project/$projectId",
  });
  const viewMode =
    (search as { mode?: string })?.mode === "preview" ? "preview" : "chat";

  const [sessions] = useState(MOCK_SESSIONS);
  const [currentSessionId, setCurrentSessionId] = useState("1");
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);

  const handleFileSelect = (node: FileNode) => {
    if (node.type === "file") {
      setSelectedFileId(node.id);
      setFileInfo(
        MOCK_FILE_CONTENTS[node.name] ?? {
          id: node.id,
          name: node.name,
          path: node.name,
          type: "text" as const,
          content: `// ${node.name} 的内容`,
          size: 100,
          lastModified: new Date(),
        }
      );
    }
  };

  const handleMessageSend = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    setIsGenerating(true);
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "收到你的请求，正在处理中...",
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsGenerating(false);
    }, 1000);
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        description={`工作区: ${workspaceId}`}
        title={`项目: ${projectId}`}
      />
      <ProjectView
        className="flex-1"
        currentSessionId={currentSessionId}
        fileInfo={fileInfo}
        files={MOCK_FILES}
        isGenerating={isGenerating}
        messages={messages}
        onAbort={() => setIsGenerating(false)}
        onFileSelect={handleFileSelect}
        onMessageSend={handleMessageSend}
        onSessionSelect={setCurrentSessionId}
        selectedFileId={selectedFileId}
        sessions={sessions}
        viewMode={viewMode}
      />
    </div>
  );
}

export const Route = createFileRoute(
  "/workspace/$workspaceId/project/$projectId"
)({
  component: ProjectPage,
});
