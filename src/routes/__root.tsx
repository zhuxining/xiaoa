import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRootRoute,
  Link,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import {
  Bot,
  Brain,
  Database,
  FileText,
  FolderOpen,
  Loader2,
  Plus,
  Settings,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getConfig, setActiveWorkspace } from "@/actions/config";
import { addProject, getProjects, selectFolder } from "@/actions/project";
import { createWorkspace, getWorkspaces } from "@/actions/workspace";
import { AppLayout } from "@/components/layout/app-layout";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/layout/sidebar";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

function Root() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 加载工作区列表
  const { data: workspaces = [], isLoading: isLoadingWorkspaces } = useQuery({
    queryKey: ["workspaces"],
    queryFn: getWorkspaces,
  });

  // 加载全局配置
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: getConfig,
  });

  // 当前活跃工作区
  const activeWorkspaceId = config?.activeWorkspaceId ?? null;
  const currentWorkspaceId =
    activeWorkspaceId && workspaces.some((w) => w.id === activeWorkspaceId)
      ? activeWorkspaceId
      : null;

  // 新建工作区对话框状态
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  // 加载项目列表
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", currentWorkspaceId],
    queryFn: () => getProjects(currentWorkspaceId ?? ""),
    enabled: !!currentWorkspaceId,
  });

  // 创建工作区
  const createMutation = useMutation({
    mutationFn: (name: string) => createWorkspace({ name }),
    onSuccess: async (workspace) => {
      // 设置为活跃工作区
      await setActiveWorkspace(workspace.id);
      // 刷新数据
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["config"] });
      // 关闭对话框
      setCreateDialogOpen(false);
      setNewWorkspaceName("");
      toast.success("工作区创建成功");
      // 导航到新工作区的 Agent 配置页
      navigate({ to: `/workspace/${workspace.id}/agent` });
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  // 添加项目
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

  // 打开文件夹
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

  // 切换工作区
  const handleWorkspaceChange = async (id: string) => {
    await setActiveWorkspace(id);
    queryClient.invalidateQueries({ queryKey: ["config"] });
    // 导航到新工作区的 Agent 配置页
    navigate({ to: `/workspace/${id}/agent` });
  };

  // 重命名工作区
  const _handleWorkspaceRename = async (id: string, name: string) => {
    try {
      const { updateWorkspace } = await import("@/actions/workspace");
      await updateWorkspace({ id, name });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("工作区重命名成功");
    } catch (error) {
      toast.error(`重命名失败: ${(error as Error).message}`);
    }
  };

  // 删除工作区
  const _handleWorkspaceDelete = async (id: string) => {
    try {
      const { deleteWorkspace } = await import("@/actions/workspace");
      const result = await deleteWorkspace(id);
      if (result.success) {
        // 如果删除的是当前工作区，切换到第一个工作区
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
        // 导航到首页
        navigate({ to: "/" });
      }
    } catch (error) {
      toast.error(`删除失败: ${(error as Error).message}`);
    }
  };

  // 处理创建工作区
  const handleCreate = () => {
    if (!newWorkspaceName.trim()) {
      toast.error("请输入工作区名称");
      return;
    }
    createMutation.mutate(newWorkspaceName.trim());
  };

  return (
    <>
      <AppLayout
        sidebar={
          <Sidebar>
            <SidebarHeader>
              <SidebarNav
                items={[
                  {
                    to: "/",
                    icon: <Bot className="size-4" />,
                    label: "小A",
                  },
                ]}
              />
              {isLoadingWorkspaces ? (
                <div className="flex items-center justify-center p-2">
                  <Loader2 className="size-4 animate-spin" />
                </div>
              ) : (
                <WorkspaceSwitcher
                  currentWorkspaceId={currentWorkspaceId ?? ""}
                  onWorkspaceChange={handleWorkspaceChange}
                  onWorkspaceCreate={() => setCreateDialogOpen(true)}
                  onWorkspaceDelete={_handleWorkspaceDelete}
                  onWorkspaceRename={_handleWorkspaceRename}
                  workspaces={workspaces.map((w) => ({
                    id: w.id,
                    name: w.name,
                    avatar: w.agent.avatar,
                  }))}
                />
              )}
            </SidebarHeader>
            <SidebarContent>
              {currentWorkspaceId ? (
                <>
                  <SidebarNav
                    items={[
                      {
                        to: `/workspace/${currentWorkspaceId}/agent`,
                        icon: <Brain className="size-4" />,
                        label: "Agent 配置",
                      },
                      {
                        to: `/workspace/${currentWorkspaceId}/skills`,
                        icon: <Wrench className="size-4" />,
                        label: "技能管理",
                      },
                      {
                        to: `/workspace/${currentWorkspaceId}/memories`,
                        icon: <FileText className="size-4" />,
                        label: "记忆",
                      },
                      {
                        to: `/workspace/${currentWorkspaceId}/knowledge`,
                        icon: <Database className="size-4" />,
                        label: "知识库",
                      },
                    ]}
                    title="工作区"
                  />
                  <SidebarNav
                    action={
                      <button
                        className="rounded p-0.5 hover:bg-muted"
                        onClick={handleOpenFolder}
                        title="打开文件夹"
                        type="button"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    }
                    items={projects.map((p) => ({
                      to: `/workspace/${currentWorkspaceId}/project/${p.id}`,
                      icon: <FolderOpen className="size-4" />,
                      label: p.name,
                    }))}
                    title="项目"
                  />
                </>
              ) : (
                <div className="rounded-md border border-dashed p-3 text-muted-foreground text-xs">
                  <div>未选择工作区</div>
                  <Button
                    className="mt-2 w-full justify-start gap-2"
                    onClick={() => setCreateDialogOpen(true)}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="size-3.5" />
                    新建工作区
                  </Button>
                </div>
              )}
            </SidebarContent>
            <SidebarFooter>
              <Link to="/settings">
                <Button
                  className="w-full justify-start gap-2"
                  size="sm"
                  variant="ghost"
                >
                  <Settings className="size-4" />
                  设置
                </Button>
              </Link>
            </SidebarFooter>
          </Sidebar>
        }
      >
        <Outlet />
      </AppLayout>

      {/* 新建工作区对话框 */}
      <Dialog onOpenChange={setCreateDialogOpen} open={createDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建工作区</DialogTitle>
            <DialogDescription>
              创建一个新的工作区来配置你的 Agent
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreate();
                }
              }}
              placeholder="工作区名称"
              value={newWorkspaceName}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => setCreateDialogOpen(false)}
              variant="outline"
            >
              取消
            </Button>
            <Button disabled={createMutation.isPending} onClick={handleCreate}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const Route = createRootRoute({
  component: Root,
});
