import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { getConfig, setActiveWorkspace } from "@/actions/config";
import { addProject, getProjects, selectFolder } from "@/actions/project";
import { createWorkspace, getWorkspaces } from "@/actions/workspace";

export function useWorkspaceShell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: workspaces = [], isLoading: isLoadingWorkspaces } = useQuery({
    queryKey: ["workspaces"],
    queryFn: getWorkspaces,
  });

  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: getConfig,
  });

  const activeWorkspaceId = config?.activeWorkspaceId ?? null;
  const currentWorkspaceId =
    activeWorkspaceId && workspaces.some((w) => w.id === activeWorkspaceId)
      ? activeWorkspaceId
      : null;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", currentWorkspaceId],
    queryFn: () => getProjects(currentWorkspaceId ?? ""),
    enabled: !!currentWorkspaceId,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createWorkspace({ name }),
    onSuccess: async (workspace) => {
      await setActiveWorkspace(workspace.id);
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["config"] });
      setCreateDialogOpen(false);
      setNewWorkspaceName("");
      toast.success("工作区创建成功");
      navigate({ to: `/workspace/${workspace.id}/agent` });
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const addProjectMutation = useMutation({
    mutationFn: ({
      workspaceId,
      path,
    }: {
      workspaceId: string;
      path: string;
    }) => addProject({ workspaceId, path }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({
        queryKey: ["projects", currentWorkspaceId],
      });
      navigate({
        to: `/workspace/${currentWorkspaceId}/project/${project.id}`,
      });
    },
    onError: (error) => {
      toast.error(`添加项目失败: ${error.message}`);
    },
  });

  const handleOpenFolder = async () => {
    if (!currentWorkspaceId) {
      return;
    }
    const path = await selectFolder();
    if (!path) {
      return;
    }
    addProjectMutation.mutate({ workspaceId: currentWorkspaceId, path });
  };

  const handleWorkspaceChange = async (id: string) => {
    await setActiveWorkspace(id);
    queryClient.invalidateQueries({ queryKey: ["config"] });
    navigate({ to: `/workspace/${id}/agent` });
  };

  const handleWorkspaceRename = async (id: string, name: string) => {
    try {
      const { updateWorkspace } = await import("@/actions/workspace");
      await updateWorkspace({ id, name });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("工作区重命名成功");
    } catch (error) {
      toast.error(`重命名失败: ${(error as Error).message}`);
    }
  };

  const handleWorkspaceDelete = async (id: string) => {
    try {
      const { deleteWorkspace } = await import("@/actions/workspace");
      const result = await deleteWorkspace(id);
      if (result.success) {
        if (currentWorkspaceId === id && workspaces.length > 1) {
          const nextWorkspace = workspaces.find((w) => w.id !== id);
          if (nextWorkspace) {
            await setActiveWorkspace(nextWorkspace.id);
          }
        } else if (currentWorkspaceId === id) {
          await setActiveWorkspace(null);
        }
        queryClient.invalidateQueries({ queryKey: ["workspaces"] });
        queryClient.invalidateQueries({ queryKey: ["config"] });
        toast.success("工作区删除成功");
        navigate({ to: "/" });
      }
    } catch (error) {
      toast.error(`删除失败: ${(error as Error).message}`);
    }
  };

  const handleCreate = () => {
    if (!newWorkspaceName.trim()) {
      toast.error("请输入工作区名称");
      return;
    }
    createMutation.mutate(newWorkspaceName.trim());
  };

  return {
    workspaces,
    projects,
    isLoadingWorkspaces,
    currentWorkspaceId,
    createDialogOpen,
    setCreateDialogOpen,
    newWorkspaceName,
    setNewWorkspaceName,
    createMutation,
    handleOpenFolder,
    handleWorkspaceChange,
    handleWorkspaceRename,
    handleWorkspaceDelete,
    handleCreate,
  };
}
