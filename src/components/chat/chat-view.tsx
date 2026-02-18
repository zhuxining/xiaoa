import { cn } from "@/utils/tailwind";
import type { FileMenuItem } from "./file-menu";
import { MessageInput } from "./message-input";
import { MessageList } from "./message-list";
import { PermissionBar } from "./permission-bar";
import type { PermissionRequest } from "./permission-dialog";
import { SessionList } from "./session-list";
import type { SkillMenuItem } from "./skill-menu";

export interface Session {
  id: string;
  messageCount: number;
  title: string;
  updatedAt: Date;
}

export interface Message {
  content: string;
  createdAt: Date;
  id: string;
  role: "user" | "assistant";
}

interface ChatViewProps {
  agentAvatar?: string;
  agentName?: string;
  className?: string;
  currentSessionId?: string;
  files?: FileMenuItem[];
  isGenerating?: boolean;
  messages: Message[];
  onAbort?: () => void;
  onMessageSend: (message: string) => void;
  onPermissionAllow?: (request: PermissionRequest) => void;
  onPermissionDeny?: (request: PermissionRequest) => void;
  onSessionCreate?: () => void;
  onSessionSelect: (id: string) => void;
  onSkillSelect?: (skill: SkillMenuItem) => void;
  permissionRequest?: PermissionRequest | null;
  sessions: Session[];
  showSessionList?: boolean;
  skills?: SkillMenuItem[];
}

export function ChatView({
  sessions,
  currentSessionId,
  messages,
  isGenerating,
  agentName,
  agentAvatar,
  skills = [],
  files = [],
  permissionRequest,
  onSessionSelect,
  onSessionCreate,
  onMessageSend,
  onAbort,
  onSkillSelect,
  onPermissionAllow,
  onPermissionDeny,
  showSessionList = true,
  className,
}: ChatViewProps) {
  return (
    <div className={cn("flex h-full", className)} data-slot="chat-view">
      {showSessionList && (
        <SessionList
          className="w-60"
          currentSessionId={currentSessionId}
          onSessionCreate={onSessionCreate}
          onSessionSelect={onSessionSelect}
          sessions={sessions}
        />
      )}
      <div className="flex flex-1 flex-col">
        <MessageList
          agentAvatar={agentAvatar}
          agentName={agentName}
          messages={messages}
        />
        <MessageInput
          files={files}
          isGenerating={isGenerating}
          onAbort={onAbort}
          onSend={onMessageSend}
          onSkillSelect={onSkillSelect}
          skills={skills}
        />
        <PermissionBar
          key={permissionRequest?.id ?? "permission-none"}
          onAllow={onPermissionAllow}
          onDeny={onPermissionDeny}
          request={permissionRequest ?? null}
        />
      </div>
    </div>
  );
}
