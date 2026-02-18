import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
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
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { useWorkspaceShell } from "@/hooks/use-workspace-shell";

function Root() {
  const {
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
  } = useWorkspaceShell();

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
                  onWorkspaceDelete={handleWorkspaceDelete}
                  onWorkspaceRename={handleWorkspaceRename}
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

      <CreateWorkspaceDialog
        isSubmitting={createMutation.isPending}
        name={newWorkspaceName}
        onConfirm={handleCreate}
        onNameChange={setNewWorkspaceName}
        onOpenChange={setCreateDialogOpen}
        open={createDialogOpen}
      />
    </>
  );
}

export const Route = createRootRoute({
  component: Root,
});
