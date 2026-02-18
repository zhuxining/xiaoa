import type { AgentMessage, AgentTool } from "@mariozechner/pi-agent-core";
import { cn } from "@/utils/tailwind";
import type { FileMenuItem } from "./file-menu";
import { MessageInput } from "./message-input";
import { PermissionBar } from "./permission-bar";
import type { PermissionRequest } from "./permission-dialog";
import { PiMessageList } from "./pi-message-list";
import { SessionList } from "./session-list";
import type { SkillMenuItem } from "./skill-menu";

export interface Session {
  id: string;
  messageCount: number;
  title: string;
  updatedAt: Date;
}

interface ChatViewProps {
  agentAvatar?: string;
  agentName?: string;
  className?: string;
  currentSessionId?: string;
  files?: FileMenuItem[];
  isGenerating?: boolean;
  /** Agent 消息列表（pi-agent-core AgentMessage[]） */
  messages: AgentMessage[];
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
  /** 流式消息（追加到 messages 末尾） */
  streamingMessage?: AgentMessage | null;
  /** 可用工具列表 */
  tools?: AgentTool[];
}

export function ChatView({
  sessions,
  currentSessionId,
  messages,
  isGenerating,
  streamingMessage,
  skills = [],
  files = [],
  tools = [],
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
        <PiMessageList
          isStreaming={isGenerating}
          messages={messages}
          streamingMessage={streamingMessage}
          tools={tools}
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
