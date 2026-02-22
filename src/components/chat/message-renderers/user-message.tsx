import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/utils/tailwind";

interface UserMessageProps {
  className?: string;
  content: string;
  timestamp: number;
}

export function UserMessage({
  content,
  timestamp,
  className,
}: UserMessageProps) {
  return (
    <div
      className={cn("flex justify-end gap-3", className)}
      data-slot="user-message"
    >
      <div className="flex max-w-[80%] flex-col items-end gap-1">
        <div className="rounded-lg bg-primary px-3 py-2 text-primary-foreground">
          <div className="whitespace-pre-wrap text-sm">{content}</div>
        </div>
        <span className="text-muted-foreground text-xs">
          {new Date(timestamp).toLocaleTimeString()}
        </span>
      </div>
      <Avatar size="sm">
        <AvatarImage src="" />
        <AvatarFallback>
          <User className="size-3" />
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
