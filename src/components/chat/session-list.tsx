import { MessageSquare, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatSession } from "@/types/session";
import { cn } from "@/utils/tailwind";

interface SessionListProps {
  className?: string;
  currentSessionId?: string;
  onSessionCreate?: () => void;
  onSessionDelete?: (id: string) => void;
  onSessionRename?: (id: string, newTitle: string) => void;
  onSessionSelect: (id: string) => void;
  sessions: ChatSession[];
}

export function SessionList({
  sessions,
  currentSessionId,
  onSessionSelect,
  onSessionCreate,
  onSessionDelete,
  onSessionRename,
  className,
}: SessionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSessions = sessions.filter(
    (session) =>
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.messageCount.toString().includes(searchQuery)
  );

  const handleStartEdit = (session: ChatSession) => {
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveEdit = () => {
    if (editingId && editTitle.trim() && onSessionRename) {
      onSessionRename(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleDeleteClick = (session: ChatSession) => {
    setSessionToDelete(session);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (sessionToDelete && onSessionDelete) {
      onSessionDelete(sessionToDelete.id);
    }
    setSessionToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleDeleteCancel = () => {
    setSessionToDelete(null);
    setDeleteDialogOpen(false);
  };

  return (
    <div
      className={cn("flex h-full flex-col border-r bg-muted/30", className)}
      data-slot="session-list"
    >
      <div className="nodraglayer relative z-50 space-y-2 border-b p-2">
        <Button
          className="w-full justify-start gap-2"
          onClick={onSessionCreate}
          size="sm"
          variant="outline"
        >
          <Plus className="size-4" />
          新建会话
        </Button>
        {sessions.length > 0 && (
          <div className="relative">
            <Search className="absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-7 pl-6 text-xs"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索会话..."
              value={searchQuery}
            />
          </div>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 p-2">
          {filteredSessions.map((session) => (
            <div
              className={cn(
                "group flex w-full items-center gap-1 rounded-md px-1 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                session.id === currentSessionId && "bg-muted"
              )}
              key={session.id}
            >
              {editingId === session.id ? (
                <input
                  autoFocus
                  className="flex-1 rounded border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
                  onBlur={handleSaveEdit}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  type="text"
                  value={editTitle}
                />
              ) : (
                <>
                  <button
                    className="flex flex-1 items-center gap-2 truncate px-1"
                    onClick={() => onSessionSelect(session.id)}
                    type="button"
                  >
                    <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {session.title}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {session.messageCount} 条消息
                      </div>
                    </div>
                  </button>
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    {onSessionRename && (
                      <Button
                        className="h-5 w-5"
                        onClick={() => handleStartEdit(session)}
                        size="icon-sm"
                        title="重命名"
                        variant="ghost"
                      >
                        <Pencil className="size-3" />
                      </Button>
                    )}
                    {onSessionDelete && (
                      <Button
                        className="h-5 w-5 hover:text-destructive"
                        onClick={() => handleDeleteClick(session)}
                        size="icon-sm"
                        title="删除会话"
                        variant="ghost"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <MessageSquare className="size-10 text-muted-foreground/50" />
              <div>
                <p className="font-medium text-sm">暂无会话</p>
                <p className="mt-1 text-muted-foreground text-xs">
                  点击上方按钮开始第一个对话
                </p>
              </div>
              <Button
                className="mt-1"
                onClick={onSessionCreate}
                size="sm"
                variant="secondary"
              >
                <Plus className="mr-1 size-4" />
                创建会话
              </Button>
            </div>
          )}
          {sessions.length > 0 && filteredSessions.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-sm">
              未找到匹配的会话
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 删除确认对话框 */}
      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除会话？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除会话「{sessionToDelete?.title}
              」及其所有消息记录，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
