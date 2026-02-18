import {
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { useCallback, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/tailwind";

interface Workspace {
  avatar?: string;
  id: string;
  name: string;
}

interface WorkspaceSwitcherProps {
  className?: string;
  currentWorkspaceId: string;
  onWorkspaceChange: (id: string) => void;
  onWorkspaceCreate?: () => void;
  onWorkspaceDelete?: (id: string) => void;
  onWorkspaceRename?: (id: string, name: string) => void;
  onWorkspaceSettings?: () => void;
  workspaces: Workspace[];
}

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
  onWorkspaceChange,
  onWorkspaceCreate,
  onWorkspaceSettings,
  onWorkspaceRename,
  onWorkspaceDelete,
  className,
}: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(
    null
  );
  const [renameValue, setRenameValue] = useState("");

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);

  const handleRenameClick = useCallback((workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setRenameValue(workspace.name);
    setRenameDialogOpen(true);
  }, []);

  const handleDeleteClick = useCallback((workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setDeleteDialogOpen(true);
  }, []);

  const handleRenameConfirm = useCallback(() => {
    if (selectedWorkspace && renameValue.trim() && onWorkspaceRename) {
      onWorkspaceRename(selectedWorkspace.id, renameValue.trim());
    }
    setRenameDialogOpen(false);
    setSelectedWorkspace(null);
  }, [selectedWorkspace, renameValue, onWorkspaceRename]);

  const handleDeleteConfirm = useCallback(() => {
    if (selectedWorkspace && onWorkspaceDelete) {
      onWorkspaceDelete(selectedWorkspace.id);
    }
    setDeleteDialogOpen(false);
    setSelectedWorkspace(null);
  }, [selectedWorkspace, onWorkspaceDelete]);

  const canDelete = workspaces.length > 1;

  return (
    <>
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
            <div
              className="group relative flex items-center"
              key={workspace.id}
            >
              <DropdownMenuItem
                className={cn(
                  "flex-1 pr-8",
                  workspace.id === currentWorkspaceId && "bg-muted"
                )}
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
              {(onWorkspaceRename || onWorkspaceDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="absolute top-1/2 right-1 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="right">
                    {onWorkspaceRename && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameClick(workspace);
                        }}
                      >
                        <Pencil className="mr-2 size-4" />
                        重命名
                      </DropdownMenuItem>
                    )}
                    {onWorkspaceDelete && (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        disabled={!canDelete}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(workspace);
                        }}
                      >
                        <Trash2 className="mr-2 size-4" />
                        删除
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
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

      {/* 重命名对话框 */}
      <Dialog onOpenChange={setRenameDialogOpen} open={renameDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>重命名工作区</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRenameConfirm();
                }
              }}
              placeholder="工作区名称"
              value={renameValue}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => setRenameDialogOpen(false)}
              variant="outline"
            >
              取消
            </Button>
            <Button
              disabled={!renameValue.trim()}
              onClick={handleRenameConfirm}
            >
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除工作区</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除工作区 "{selectedWorkspace?.name}"
              吗？此操作无法撤销，工作区的所有数据将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
