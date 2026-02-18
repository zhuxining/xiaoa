import { MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils/tailwind";

interface Session {
  id: string;
  title: string;
  updatedAt: Date;
  messageCount: number;
}

interface SessionListProps {
  sessions: Session[];
  currentSessionId?: string;
  onSessionSelect: (id: string) => void;
  onSessionCreate?: () => void;
  className?: string;
}

export function SessionList({
  sessions,
  currentSessionId,
  onSessionSelect,
  onSessionCreate,
  className,
}: SessionListProps) {
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
            <button
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                session.id === currentSessionId && "bg-muted"
              )}
              key={session.id}
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
