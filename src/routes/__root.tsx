import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import {
  Bot,
  Brain,
  Database,
  FileText,
  FolderOpen,
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

const WORKSPACES = [{ id: "default", name: "默认工作区" }];

// Mock projects - 后续从状态管理获取
const PROJECTS = [{ id: "demo", name: "示例项目" }];

function Root() {
  return (
    <AppLayout
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <WorkspaceSwitcher
              currentWorkspaceId="default"
              onWorkspaceChange={() => {
                // TODO: 实现工作区切换
              }}
              workspaces={WORKSPACES}
            />
          </SidebarHeader>
          <SidebarContent>
            <SidebarNav
              items={[
                { to: "/", icon: <Bot className="size-4" />, label: "小A" },
                {
                  to: "/workspace/default/agent",
                  icon: <Brain className="size-4" />,
                  label: "Agent 配置",
                },
                {
                  to: "/workspace/default/skills",
                  icon: <Wrench className="size-4" />,
                  label: "技能管理",
                },
                {
                  to: "/workspace/default/memories",
                  icon: <FileText className="size-4" />,
                  label: "记忆",
                },
                {
                  to: "/workspace/default/knowledge",
                  icon: <Database className="size-4" />,
                  label: "知识库",
                },
              ]}
              title="工作区"
            />
            <SidebarNav
              items={PROJECTS.map((p) => ({
                to: `/workspace/default/project/${p.id}`,
                icon: <FolderOpen className="size-4" />,
                label: p.name,
              }))}
              title="项目"
            />
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
  );
}

export const Route = createRootRoute({
  component: Root,
});
