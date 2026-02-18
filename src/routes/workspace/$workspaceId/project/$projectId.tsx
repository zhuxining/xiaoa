// biome-ignore lint/style/useFilenamingConvention: TanStack Router requires $paramName format for route params
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
  abortChat,
  type ChatEvent,
  getChatEvents,
  respondChatPermission,
  sendChat,
} from "@/actions/chat";
import {
  getProjects,
  readDir,
  readFile,
  removeProject,
} from "@/actions/project";
import {
  createSisson,
  deleteSisson,
  getSissonMessages,
  listSissons,
} from "@/actions/sisson";
import { getSkills } from "@/actions/skill";
import {
  getWorkspace,
  updateWorkspace,
  type WorkspacePermissions,
} from "@/actions/workspace";
import type { FileMenuItem } from "@/components/chat/file-menu";
import type { PermissionRequest } from "@/components/chat/permission-dialog";
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

function applyProjectChatEvent(
  event: ChatEvent,
  onDelta: (delta: string) => void,
  onReset: () => void,
  onError: (message: string) => void
): void {
  if (event.type === "message_start") {
    onReset();
    return;
  }

  if (event.type === "message_delta") {
    onDelta(event.content ?? "");
    return;
  }

  if (event.type === "message_end") {
    onReset();
    return;
  }

  if (event.type === "run_error") {
    onError(event.error ?? "生成失败");
  }
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
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [eventCursor, setEventCursor] = useState(0);
  const [permissionMode, setPermissionMode] =
    useState<PermissionMode>("review");
  const [permissionRequest, setPermissionRequest] =
    useState<PermissionRequest | null>(null);

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

  const updatePermissionMutation = useMutation({
    mutationFn: (mode: PermissionMode) =>
      updateWorkspace({
        id: workspaceId,
        permissions: {
          mode,
        },
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

  const sendChatMutation = useMutation({
    mutationFn: sendChat,
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
    onError: (error) => {
      setIsGenerating(false);
      setStreamingContent("");
      setActiveRunId(null);
      toast.error(`发送消息失败: ${error.message}`);
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

  const { data: eventResult } = useQuery({
    queryKey: [
      "chat",
      "events",
      "workspace",
      workspaceId,
      currentSessionId,
      eventCursor,
      activeRunId,
    ],
    queryFn: () =>
      currentSessionId
        ? getChatEvents({
            scope: "workspace",
            workspaceId,
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
      if (event.type === "permission_request") {
        setPermissionRequest({
          id: event.permissionId ?? `perm-${event.seq}`,
          type: event.permissionType ?? "execute",
          title: event.permissionTitle ?? "权限确认",
          description: event.permissionDescription ?? "Agent 请求执行操作",
          details: event.permissionDetails,
          risk: event.permissionRisk,
        });
        continue;
      }

      if (event.type === "permission_resolved") {
        setPermissionRequest(null);
        continue;
      }

      applyProjectChatEvent(
        event,
        (delta) => setStreamingContent((prev) => prev + delta),
        () => setStreamingContent(""),
        (message) => toast.error(message)
      );
    }

    if (!eventResult.running) {
      setIsGenerating(false);
      setActiveRunId(null);
      setStreamingContent("");
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
    }
  }, [
    currentSessionId,
    eventCursor,
    eventResult,
    projectId,
    queryClient,
    workspaceId,
  ]);

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

  const dispatchChat = useCallback(
    (content: string) => {
      if (!currentSessionId) {
        return;
      }
      setPermissionRequest(null);
      setIsGenerating(true);
      setStreamingContent("");
      sendChatMutation.mutate(
        {
          scope: "workspace",
          workspaceId,
          sessionId: currentSessionId,
          content,
        },
        {
          onSuccess: (result) => {
            setActiveRunId(result.runId);
          },
        }
      );

      navigate({
        to: "/workspace/$workspaceId/project/$projectId",
        params: { workspaceId, projectId },
        search: (prev: ProjectSearch) => ({
          ...prev,
          session: currentSessionId,
          mode: "chat" as const,
        }),
      });
    },
    [currentSessionId, navigate, projectId, sendChatMutation, workspaceId]
  );

  const handleMessageSend = (content: string) => {
    if (!currentSessionId) {
      return;
    }

    dispatchChat(content);
  };

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
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [cyclePermissionMode]);

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
          if (currentSessionId) {
            abortChat({
              scope: "workspace",
              workspaceId,
              sessionId: currentSessionId,
              runId: activeRunId ?? undefined,
            });
          }
          setIsGenerating(false);
          setStreamingContent("");
          setActiveRunId(null);
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
        onPermissionAllow={() => {
          if (!(currentSessionId && activeRunId && permissionRequest)) {
            setPermissionRequest(null);
            return;
          }

          respondChatPermission({
            scope: "workspace",
            workspaceId,
            sessionId: currentSessionId,
            runId: activeRunId,
            requestId: permissionRequest.id,
            decision: "allow",
            alwaysAllowInSession: permissionRequest.rememberInSession ?? false,
          });
        }}
        onPermissionDeny={() => {
          if (currentSessionId && activeRunId && permissionRequest) {
            respondChatPermission({
              scope: "workspace",
              workspaceId,
              sessionId: currentSessionId,
              runId: activeRunId,
              requestId: permissionRequest.id,
              decision: "deny",
            });
          }
          setPermissionRequest(null);
          toast.error("已拒绝本次危险操作");
        }}
        onPermissionModeChange={(mode) => {
          setPermissionMode(mode);
          updatePermissionMutation.mutate(mode);
        }}
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
        permissionMode={permissionMode}
        permissionRequest={permissionRequest}
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
