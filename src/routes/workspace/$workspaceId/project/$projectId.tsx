// biome-ignore lint/style/useFilenamingConvention: TanStack Router requires $paramName format for route params
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { getProjects, readDir, readFile } from "@/actions/project";
import { createSession, getSessions } from "@/actions/xiaoa";
import type { FileInfo } from "@/components/project/file-preview";
import type { FileNode } from "@/components/project/file-tree";
import { ProjectView } from "@/components/project/project-view";
import { PageHeader } from "@/components/shared/page-header";

// 从文件扩展名推断 FileInfo type
function inferFileType(name: string): "text" | "code" | "image" | "binary" {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) {
    return "image";
  }
  if (["md", "txt", "log", "csv", "env"].includes(ext)) {
    return "text";
  }
  if (ext === "") {
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

  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(
    undefined
  );
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // 加载当前工作区的项目列表，找到目标项目
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", workspaceId],
    queryFn: () => getProjects(workspaceId),
  });
  const project = projects.find((p) => p.id === projectId);

  // 加载文件树（当项目路径可用时）
  const { data: files = [] } = useQuery({
    queryKey: ["readDir", project?.path],
    queryFn: () => readDir(project?.path ?? ""),
    enabled: !!project?.path,
  });

  // 加载会话列表（过滤当前项目）
  const { data: allSessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: getSessions,
  });
  const sessions = allSessions
    .filter((s) => s.projectId === projectId)
    .map((s) => ({
      id: s.id,
      title: s.title,
      updatedAt: new Date(s.updatedAt),
      messageCount: s.messageCount,
    }));

  // 创建会话
  const createSessionMutation = useMutation({
    mutationFn: () => createSession({ projectId }),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setCurrentSessionId(session.id);
    },
    onError: (error) => {
      toast.error(`创建会话失败: ${error.message}`);
    },
  });

  // 文件选择
  const handleFileSelect = async (node: FileNode) => {
    if (node.type !== "file") {
      return;
    }
    setSelectedFileId(node.id);
    try {
      // node.id 是绝对路径（IPC store 中 id = fullPath）
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

  // 消息发送（占位，待 Agent 集成）
  const handleMessageSend = (_content: string) => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 500);
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        description={project ? project.path : `工作区: ${workspaceId}`}
        title={project ? project.name : projectId}
      />
      <ProjectView
        className="flex-1"
        currentSessionId={currentSessionId}
        fileInfo={fileInfo}
        files={files}
        isGenerating={isGenerating}
        messages={[]}
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
