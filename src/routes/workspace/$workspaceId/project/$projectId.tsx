// biome-ignore lint/style/useFilenamingConvention: TanStack Router requires $paramName format for route params
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getProjects, readDir, readFile } from "@/actions/project";
import {
  addSissonMessage,
  createSisson,
  getSissonMessages,
  listSissons,
} from "@/actions/sisson";
import { getWorkspace } from "@/actions/workspace";
import type { FileInfo } from "@/components/project/file-preview";
import type { FileNode } from "@/components/project/file-tree";
import { ProjectView } from "@/components/project/project-view";
import { PageHeader } from "@/components/shared/page-header";

function inferFileType(name: string): "text" | "code" | "image" | "binary" {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) {
    return "image";
  }
  if (["md", "txt", "log", "csv", "env"].includes(ext) || ext === "") {
    return "text";
  }
  return "code";
}

function ProjectPage() {
  const { workspaceId, projectId } = Route.useParams();
  const queryClient = useQueryClient();
  const search = useSearch({
    from: "/workspace/$workspaceId/project/$projectId",
  });
  const viewMode =
    (search as { mode?: string })?.mode === "preview" ? "preview" : "chat";

  const [currentSessionId, setCurrentSessionId] = useState<
    string | undefined
  >();
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => getWorkspace(workspaceId),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", workspaceId],
    queryFn: () => getProjects(workspaceId),
  });
  const project = projects.find((p) => p.id === projectId);

  const { data: files = [] } = useQuery({
    queryKey: ["readDir", project?.path],
    queryFn: () => readDir(project?.path ?? ""),
    enabled: !!project?.path,
  });

  const { data: sessionData = [] } = useQuery({
    queryKey: ["sisson", "workspace", workspaceId, "sessions", projectId],
    queryFn: () =>
      listSissons({
        scope: "workspace",
        workspaceId,
        projectId,
      }),
  });

  const sessions = sessionData.map((session) => ({
    id: session.id,
    title: session.title,
    updatedAt: new Date(session.updatedAt),
    messageCount: session.messageCount,
  }));

  useEffect(() => {
    if (!currentSessionId && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [currentSessionId, sessions]);

  const { data: messagesData = [] } = useQuery({
    queryKey: [
      "sisson",
      "workspace",
      workspaceId,
      "messages",
      currentSessionId,
    ],
    queryFn: () =>
      currentSessionId
        ? getSissonMessages({
            scope: "workspace",
            workspaceId,
            sessionId: currentSessionId,
          })
        : [],
    enabled: !!currentSessionId,
  });

  const messages = messagesData.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: new Date(message.timestamp),
  }));

  const createSessionMutation = useMutation({
    mutationFn: () =>
      createSisson({
        scope: "workspace",
        workspaceId,
        projectId,
      }),
    onSuccess: (session) => {
      queryClient.invalidateQueries({
        queryKey: ["sisson", "workspace", workspaceId, "sessions", projectId],
      });
      setCurrentSessionId(session.id);
    },
    onError: (error) => {
      toast.error(`创建会话失败: ${error.message}`);
    },
  });

  const addMessageMutation = useMutation({
    mutationFn: addSissonMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "sisson",
          "workspace",
          workspaceId,
          "messages",
          currentSessionId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["sisson", "workspace", workspaceId, "sessions", projectId],
      });
    },
  });

  const handleFileSelect = async (node: FileNode) => {
    if (node.type !== "file") {
      return;
    }

    setSelectedFileId(node.id);
    try {
      const result = await readFile(node.id);
      setFileInfo({
        id: result.path,
        name: result.name,
        path: result.path,
        content: result.content,
        type: inferFileType(result.name),
        size: result.size,
        lastModified: new Date(result.lastModified),
      });
    } catch {
      toast.error(`无法读取文件: ${node.name}`);
    }
  };

  const handleMessageSend = (content: string) => {
    if (!currentSessionId) {
      return;
    }

    addMessageMutation.mutate({
      scope: "workspace",
      workspaceId,
      sessionId: currentSessionId,
      role: "user",
      content,
    });

    setIsGenerating(true);

    setTimeout(() => {
      addMessageMutation.mutate({
        scope: "workspace",
        workspaceId,
        sessionId: currentSessionId,
        role: "assistant",
        content: "这是一个模拟的响应。工作区 Agent 运行时集成将在后续实现。",
      });
      setIsGenerating(false);
    }, 800);
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        description={project ? project.path : `工作区: ${workspaceId}`}
        title={project ? project.name : projectId}
      />
      <ProjectView
        agentName={workspace?.agent?.name ?? "工作区 Agent"}
        className="flex-1"
        currentSessionId={currentSessionId}
        fileInfo={fileInfo}
        files={files}
        isGenerating={isGenerating}
        messages={messages}
        onAbort={() => setIsGenerating(false)}
        onFileSelect={handleFileSelect}
        onMessageSend={handleMessageSend}
        onSessionCreate={() => createSessionMutation.mutate()}
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
