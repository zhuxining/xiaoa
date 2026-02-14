import { ChevronDown, Plus, Settings } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/tailwind";

interface Workspace {
  id: string;
  name: string;
  avatar?: string;
}

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  currentWorkspaceId: string;
  onWorkspaceChange: (id: string) => void;
  onWorkspaceCreate?: () => void;
  onWorkspaceSettings?: () => void;
  className?: string;
}

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
  onWorkspaceChange,
  onWorkspaceCreate,
  onWorkspaceSettings,
  className,
}: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn("w-full justify-start gap-2 px-2", className)}
          data-slot="workspace-switcher"
          size="sm"
          variant="ghost"
        >
          <Avatar size="sm">
            <AvatarImage src={currentWorkspace?.avatar} />
            <AvatarFallback>
              {currentWorkspace?.name?.charAt(0)?.toUpperCase() || "W"}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 truncate text-left">
            {currentWorkspace?.name || "工作区"}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel>切换工作区</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            className={cn(workspace.id === currentWorkspaceId && "bg-muted")}
            key={workspace.id}
            onClick={() => onWorkspaceChange(workspace.id)}
          >
            <Avatar className="mr-2" size="sm">
              <AvatarImage src={workspace.avatar} />
              <AvatarFallback>
                {workspace.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {workspace.name}
          </DropdownMenuItem>
        ))}
        {(onWorkspaceCreate || onWorkspaceSettings) && (
          <DropdownMenuSeparator />
        )}
        {onWorkspaceCreate && (
          <DropdownMenuItem onClick={onWorkspaceCreate}>
            <Plus className="mr-2 size-4" />
            新建工作区
          </DropdownMenuItem>
        )}
        {onWorkspaceSettings && (
          <DropdownMenuItem onClick={onWorkspaceSettings}>
            <Settings className="mr-2 size-4" />
            工作区设置
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
