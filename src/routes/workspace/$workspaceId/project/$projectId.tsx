import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  getProjects,
  readDir,
  readFile,
  removeProject,
} from "@/actions/project";
import { getSkills } from "@/actions/skill";
import {
  getWorkspace,
  updateWorkspace,
  type WorkspacePermissions,
} from "@/actions/workspace";
import type { FileMenuItem } from "@/components/chat/file-menu";
import type { SkillMenuItem } from "@/components/chat/skill-menu";
import type { FileInfo } from "@/components/project/file-preview";
import type { FileNode } from "@/components/project/file-tree";
import { ProjectView } from "@/components/project/project-view";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useChatSession } from "@/hooks/use-chat-session";

export interface ProjectSearch {
  file?: string;
  mode?: "chat" | "preview";
  session?: string;
}

const ARGUMENT_HINT_REGEX = /(\[[^\]]+\](?:\s+\[[^\]]+\])*)/;

type PermissionMode = NonNullable<WorkspacePermissions["mode"]>;

function extractArgumentHint(prompt: string): string | undefined {
  const match = prompt.match(ARGUMENT_HINT_REGEX);
  return match?.[1];
}

function flattenFiles(nodes: FileNode[]): FileMenuItem[] {
  const items: FileMenuItem[] = [];
  for (const node of nodes) {
    if (node.type === "file") {
      items.push({
        id: node.id,
        name: node.name,
        path: node.id,
      });
    } else if (node.children?.length) {
      items.push(...flattenFiles(node.children));
    }
  }
  return items;
}

function inferFileType(
  name: string
): "text" | "code" | "image" | "binary" | "pdf" {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) {
    return "image";
  }
  if (ext === "pdf") {
    return "pdf";
  }
  if (["md", "txt", "log", "csv", "env"].includes(ext) || ext === "") {
    return "text";
  }
  return "code";
}

function ProjectPage() {
  const { workspaceId, projectId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = useSearch({
    from: "/workspace/$workspaceId/project/$projectId",
  }) as ProjectSearch;
  const viewMode = search.mode === "preview" ? "preview" : "chat";

  const [selectedFileId, setSelectedFileId] = useState<string | null>(
    search.file ?? null
  );
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [permissionMode, setPermissionMode] =
    useState<PermissionMode>("review");

  // ── Workspace & Project Data ─────────────────────────────────

  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => getWorkspace(workspaceId),
  });

  useEffect(() => {
    const currentMode = workspace?.permissions?.mode ?? "review";
    setPermissionMode(currentMode);
  }, [workspace?.permissions?.mode]);

  const { data: skillsData = [] } = useQuery({
    queryKey: ["skills", workspaceId],
    queryFn: () => getSkills(workspaceId),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", workspaceId],
    queryFn: () => getProjects(workspaceId),
  });
  const project = projects.find((p) => p.id === projectId);

  const { data: files = [] } = useQuery({
    queryKey: ["readDir", project?.path],
    queryFn: () => readDir(project?.path ?? "", 5),
    enabled: !!project?.path,
  });

  const skills: SkillMenuItem[] = useMemo(
    () =>
      skillsData
        .filter((skill) => skill.enabled)
        .map((skill) => ({
          id: skill.id,
          name: skill.name,
          description: skill.description || "技能",
          argumentHint: skill.argumentHint || extractArgumentHint(skill.prompt),
        })),
    [skillsData]
  );

  const mentionFiles: FileMenuItem[] = useMemo(
    () => flattenFiles(files),
    [files]
  );

  // ── Chat Session (via Hook) ──────────────────────────────────

  const chat = useChatSession({
    scope: "workspace",
    workspaceId,
    projectPath: project?.path,
    cwd: project?.path,
    workspaceRootPath: project?.path,
    initialSessionId: search.session,
  });

  // ── URL Sync ─────────────────────────────────────────────────

  useEffect(() => {
    if (search.file) {
      setSelectedFileId(search.file);
    }
  }, [search.file]);

  useEffect(() => {
    if (!search.file) {
      return;
    }

    let cancelled = false;
    readFile(search.file)
      .then((result) => {
        if (cancelled) {
          return;
        }
        setFileInfo({
          id: result.path,
          name: result.name,
          path: result.path,
          content: result.content,
          type: inferFileType(result.name),
          size: result.size,
          lastModified: new Date(result.lastModified),
        });
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("无法加载 URL 参数中的文件预览");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [search.file]);

  // ── Permission Mode ──────────────────────────────────────────

  const updatePermissionMutation = useMutation({
    mutationFn: (mode: PermissionMode) =>
      updateWorkspace({
        id: workspaceId,
        permissions: { mode },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["workspaces"],
      });
    },
    onError: (error) => {
      toast.error(`切换权限模式失败: ${error.message}`);
    },
  });

  const closeProjectMutation = useMutation({
    mutationFn: () => removeProject(workspaceId, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", workspaceId] });
      toast.success("项目已关闭");
      navigate({ to: `/workspace/${workspaceId}/agent` });
    },
    onError: (error) => {
      toast.error(`关闭项目失败: ${error.message}`);
    },
  });

  const cyclePermissionMode = useCallback(() => {
    let nextMode: PermissionMode = "explore";
    if (permissionMode === "explore") {
      nextMode = "review";
    } else if (permissionMode === "review") {
      nextMode = "auto";
    }
    setPermissionMode(nextMode);
    updatePermissionMutation.mutate(nextMode);
    toast.success(`权限模式已切换为 ${nextMode}`);
  }, [permissionMode, updatePermissionMutation]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab" && event.shiftKey) {
        event.preventDefault();
        cyclePermissionMode();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cyclePermissionMode]);

  // ── Handlers ─────────────────────────────────────────────────

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
      navigate({
        to: "/workspace/$workspaceId/project/$projectId",
        params: { workspaceId, projectId },
        search: (prev: ProjectSearch) => ({
          ...prev,
          file: node.id,
          session: chat.currentSessionId,
          mode: "preview" as const,
        }),
      });
    } catch {
      toast.error(`无法读取文件: ${node.name}`);
    }
  };

  const handleSessionSelect = useCallback(
    (sessionId: string) => {
      chat.selectSession(sessionId);
      navigate({
        to: "/workspace/$workspaceId/project/$projectId",
        params: { workspaceId, projectId },
        search: (prev: ProjectSearch) => ({
          ...prev,
          session: sessionId,
          mode: "chat" as const,
        }),
      });
    },
    [chat, navigate, workspaceId, projectId]
  );

  const handleMessageSend = useCallback(
    (content: string) => {
      chat.sendMessage(content);
      navigate({
        to: "/workspace/$workspaceId/project/$projectId",
        params: { workspaceId, projectId },
        search: (prev: ProjectSearch) => ({
          ...prev,
          session: chat.currentSessionId,
          mode: "chat" as const,
        }),
      });
    },
    [chat, navigate, workspaceId, projectId]
  );

  const handleAbort = useCallback(() => {
    chat.abort();
    navigate({
      to: "/workspace/$workspaceId/project/$projectId",
      params: { workspaceId, projectId },
      search: (prev: ProjectSearch) => ({
        ...prev,
        session: chat.currentSessionId,
        mode: "chat" as const,
      }),
    });
  }, [chat, navigate, workspaceId, projectId]);

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        actions={
          <Button
            disabled={closeProjectMutation.isPending}
            onClick={() => closeProjectMutation.mutate()}
            size="sm"
            variant="outline"
          >
            <X className="mr-1 size-4" />
            关闭项目
          </Button>
        }
        description={project ? project.path : `工作区: ${workspaceId}`}
        title={project ? project.name : projectId}
      />
      <ProjectView
        agentName={workspace?.agent?.name ?? "工作区 Agent"}
        className="flex-1"
        currentSessionId={chat.currentSessionId}
        fileInfo={fileInfo}
        files={files}
        filesForMention={mentionFiles}
        isGenerating={chat.isGenerating}
        messages={chat.messages}
        onAbort={handleAbort}
        onFileSelect={handleFileSelect}
        onMessageSend={handleMessageSend}
        onPermissionAllow={() => {
          if (chat.permissionRequest) {
            chat.allowPermission(chat.permissionRequest);
          }
        }}
        onPermissionDeny={() => {
          if (chat.permissionRequest) {
            chat.denyPermission(chat.permissionRequest);
          }
          toast.error("已拒绝本次危险操作");
        }}
        onPermissionModeChange={(mode) => {
          setPermissionMode(mode);
          updatePermissionMutation.mutate(mode);
        }}
        onSessionCreate={chat.createSession}
        onSessionDelete={chat.deleteSession}
        onSessionSelect={handleSessionSelect}
        permissionMode={permissionMode}
        permissionRequest={chat.permissionRequest}
        selectedFileId={selectedFileId}
        sessions={chat.sessions}
        skills={skills}
        streamingMessage={chat.streamingMessage}
        viewMode={viewMode}
      />
    </div>
  );
}

export const Route = createFileRoute(
  "/workspace/$workspaceId/project/$projectId"
)({
  validateSearch: (search: Record<string, unknown>): ProjectSearch => ({
    session:
      typeof search.session === "string" && search.session.length > 0
        ? search.session
        : undefined,
    file:
      typeof search.file === "string" && search.file.length > 0
        ? search.file
        : undefined,
    mode: search.mode === "preview" ? "preview" : "chat",
  }),
  component: ProjectPage,
});
