import { MessageSquare, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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

  return (
    <div
      className={cn("flex h-full flex-col border-r bg-muted/30", className)}
      data-slot="session-list"
    >
      <div className="nodraglayer relative z-50 border-b p-2">
        <Button
          className="w-full justify-start gap-2"
          onClick={onSessionCreate}
          size="sm"
          variant="outline"
        >
          <Plus className="size-4" />
          新建会话
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 p-2">
          {sessions.map((session) => (
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
                      <div className="truncate font-medium">{session.title}</div>
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
                        className="h-5 w-5"
                        onClick={() => onSessionDelete(session.id)}
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
            <div className="py-8 text-center text-muted-foreground text-sm">
              暂无会话
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
