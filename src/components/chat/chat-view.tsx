import { useState } from "react";
import { cn } from "@/utils/tailwind";
import type { FileMenuItem } from "./file-menu";
import { MessageInput } from "./message-input";
import { MessageList } from "./message-list";
import { PermissionDialog, type PermissionRequest } from "./permission-dialog";
import { SessionList } from "./session-list";
import type { SkillMenuItem } from "./skill-menu";

export interface Session {
  id: string;
  title: string;
  updatedAt: Date;
  messageCount: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

interface ChatViewProps {
  sessions: Session[];
  currentSessionId?: string;
  messages: Message[];
  isGenerating?: boolean;
  agentName?: string;
  agentAvatar?: string;
  skills?: SkillMenuItem[];
  files?: FileMenuItem[];
  permissionRequest?: PermissionRequest | null;
  onSessionSelect: (id: string) => void;
  onSessionCreate?: () => void;
  onMessageSend: (message: string) => void;
  onAbort?: () => void;
  onSkillSelect?: (skill: SkillMenuItem) => void;
  onPermissionAllow?: (request: PermissionRequest) => void;
  onPermissionDeny?: (request: PermissionRequest) => void;
  showSessionList?: boolean;
  className?: string;
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
  const [_permissionOpen, setPermissionOpen] = useState(false);

  // 当 permissionRequest 变化时打开对话框
  const currentPermission = permissionRequest;
  const isPermissionOpen = permissionRequest !== null;

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
      </div>
      <PermissionDialog
        onAllow={(req) => {
          onPermissionAllow?.(req);
          setPermissionOpen(false);
        }}
        onDeny={(req) => {
          onPermissionDeny?.(req);
          setPermissionOpen(false);
        }}
        onOpenChange={setPermissionOpen}
        open={isPermissionOpen}
        request={currentPermission ?? null}
      />
    </div>
  );
}
