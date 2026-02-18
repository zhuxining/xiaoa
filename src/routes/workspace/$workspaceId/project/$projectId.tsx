// biome-ignore lint/style/useFilenamingConvention: TanStack Router requires $paramName format for route params
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getProjects,
  readDir,
  readFile,
  removeProject,
} from "@/actions/project";
import {
  addSissonMessage,
  createSisson,
  deleteSisson,
  getSissonMessages,
  listSissons,
} from "@/actions/sisson";
import { getSkills } from "@/actions/skill";
import { getWorkspace } from "@/actions/workspace";
import type { FileMenuItem } from "@/components/chat/file-menu";
import type { SkillMenuItem } from "@/components/chat/skill-menu";
import type { FileInfo } from "@/components/project/file-preview";
import type { FileNode } from "@/components/project/file-tree";
import { ProjectView } from "@/components/project/project-view";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export interface ProjectSearch {
  session?: string;
  file?: string;
  mode?: "chat" | "preview";
}

const ARGUMENT_HINT_REGEX = /(\[[^\]]+\](?:\s+\[[^\]]+\])*)/;

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

  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(
    search.session
  );
  const [selectedFileId, setSelectedFileId] = useState<string | null>(
    search.file ?? null
  );
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => getWorkspace(workspaceId),
  });

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

  const sessionExists = useMemo(
    () => sessions.some((session) => session.id === currentSessionId),
    [sessions, currentSessionId]
  );

  useEffect(() => {
    if (!currentSessionId && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [currentSessionId, sessions]);

  useEffect(() => {
    if (!search.session) {
      return;
    }
    setCurrentSessionId(search.session);
  }, [search.session]);

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

  useEffect(() => {
    if (!sessionExists && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessionExists, sessions]);

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    };
  }, []);

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
      navigate({
        to: "/workspace/$workspaceId/project/$projectId",
        params: { workspaceId, projectId },
        search: (prev: ProjectSearch) => ({
          ...prev,
          session: session.id,
          mode: "chat" as const,
        }),
      });
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

  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) =>
      deleteSisson({
        scope: "workspace",
        workspaceId,
        id: sessionId,
      }),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({
        queryKey: ["sisson", "workspace", workspaceId, "sessions", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["sisson", "workspace", workspaceId, "messages"],
      });

      if (currentSessionId === sessionId) {
        const next = sessions.find((session) => session.id !== sessionId);
        const nextId = next?.id;
        setCurrentSessionId(nextId);
        navigate({
          to: "/workspace/$workspaceId/project/$projectId",
          params: { workspaceId, projectId },
          search: (prev: ProjectSearch) => ({
            ...prev,
            session: nextId,
            mode: "chat" as const,
          }),
        });
      }
    },
    onError: (error) => {
      toast.error(`删除会话失败: ${error.message}`);
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
          session: currentSessionId,
          mode: "preview" as const,
        }),
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
    navigate({
      to: "/workspace/$workspaceId/project/$projectId",
      params: { workspaceId, projectId },
      search: (prev: ProjectSearch) => ({
        ...prev,
        session: currentSessionId,
        mode: "chat" as const,
      }),
    });

    setIsGenerating(true);
    setStreamingContent("");

    const response = `这是一个流式模拟响应：我已收到你的请求“${content}”。当前阶段先以流式输出方式返回结果，后续会接入主进程 Agent 事件流。`;
    let index = 0;
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
    }

    streamTimerRef.current = setInterval(() => {
      index += 1;
      setStreamingContent(response.slice(0, index));

      if (index >= response.length) {
        if (streamTimerRef.current) {
          clearInterval(streamTimerRef.current);
          streamTimerRef.current = null;
        }
        addMessageMutation.mutate({
          scope: "workspace",
          workspaceId,
          sessionId: currentSessionId,
          role: "assistant",
          content: response,
        });
        setIsGenerating(false);
        setStreamingContent("");
      }
    }, 20);
  };

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
        currentSessionId={currentSessionId}
        fileInfo={fileInfo}
        files={files}
        filesForMention={mentionFiles}
        isGenerating={isGenerating}
        messages={displayMessages}
        onAbort={() => {
          if (streamTimerRef.current) {
            clearInterval(streamTimerRef.current);
            streamTimerRef.current = null;
          }
          setIsGenerating(false);
          setStreamingContent("");
          navigate({
            to: "/workspace/$workspaceId/project/$projectId",
            params: { workspaceId, projectId },
            search: (prev: ProjectSearch) => ({
              ...prev,
              session: currentSessionId,
              mode: "chat" as const,
            }),
          });
        }}
        onFileSelect={handleFileSelect}
        onMessageSend={handleMessageSend}
        onSessionCreate={() => createSessionMutation.mutate()}
        onSessionDelete={(sessionId) => deleteSessionMutation.mutate(sessionId)}
        onSessionSelect={(sessionId) => {
          setCurrentSessionId(sessionId);
          navigate({
            to: "/workspace/$workspaceId/project/$projectId",
            params: { workspaceId, projectId },
            search: (prev: ProjectSearch) => ({
              ...prev,
              session: sessionId,
              mode: "chat" as const,
            }),
          });
        }}
        selectedFileId={selectedFileId}
        sessions={sessions}
        skills={skills}
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
