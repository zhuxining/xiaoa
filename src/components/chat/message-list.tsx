import { Bot, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils/tailwind";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

interface MessageListProps {
  messages: Message[];
  agentName?: string;
  agentAvatar?: string;
  className?: string;
}

export function MessageList({
  messages,
  agentName: _agentName = "小A",
  agentAvatar,
  className,
}: MessageListProps) {
  return (
    <ScrollArea className={cn("flex-1", className)} data-slot="message-list">
      <div className="flex flex-col gap-4 p-4">
        {messages.map((message) => (
          <div
            className={cn(
              "flex gap-3",
              message.role === "user" && "flex-row-reverse"
            )}
            key={message.id}
          >
            <Avatar size="sm">
              {message.role === "user" ? (
                <>
                  <AvatarImage src="" />
                  <AvatarFallback>
                    <User className="size-3" />
                  </AvatarFallback>
                </>
              ) : (
                <>
                  <AvatarImage src={agentAvatar} />
                  <AvatarFallback>
                    <Bot className="size-3" />
                  </AvatarFallback>
                </>
              )}
            </Avatar>
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-3 py-2",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              <div className="text-sm">{message.content}</div>
              <div
                className={cn(
                  "mt-1 text-xs",
                  message.role === "user"
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                )}
              >
                {message.createdAt.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <Bot className="mx-auto mb-4 size-12 opacity-50" />
            <p className="font-medium">开始与小A对话</p>
            <p className="mt-1 text-sm">输入您的问题，小A将为您提供帮助</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
