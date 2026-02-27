import type { AgentMessage, AgentTool } from "@mariozechner/pi-agent-core";
import { useNavigate } from "@tanstack/react-router";
import { Settings, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MODELS, type ModelInfo } from "@/constants/models";
import type { ChatSession } from "@/types/session";
import { cn } from "@/utils/tailwind";
import { AgentMessageList } from "./agent-message-list";
import type { FileMenuItem } from "./file-menu";
import { MessageInput } from "./message-input";
import { PermissionBar } from "./permission-bar";
import type { PermissionRequest } from "./permission-dialog";
import { SessionList } from "./session-list";
import type { SkillMenuItem } from "./skill-menu";

interface ChatViewProps {
  agentAvatar?: string;
  agentName?: string;
  className?: string;
  currentModel?: ModelInfo | null;
  currentSessionId?: string;
  files?: FileMenuItem[];
  isGenerating?: boolean;
  /** Agent 消息列表（pi-agent-core AgentMessage[]） */
  messages: AgentMessage[];
  onAbort?: () => void;
  onMessageSend: (message: string) => void;
  onModelChange?: (model: ModelInfo) => void;
  onPermissionAllow?: (request: PermissionRequest) => void;
  onPermissionDeny?: (request: PermissionRequest) => void;
  onSessionCreate?: () => void;
  onSessionDelete?: (id: string) => void;
  onSessionSelect: (id: string) => void;
  onSkillSelect?: (skill: SkillMenuItem) => void;
  permissionRequest?: PermissionRequest | null;
  sessions: ChatSession[];
  showSessionList?: boolean;
  skills?: SkillMenuItem[];
  /** 流式消息（追加到 messages 末尾） */
  streamingMessage?: AgentMessage | null;
  /** 可用工具列表 */
  tools?: AgentTool[];
}

/**
 * 模型选择器组件
 */
function ModelSelector({
  currentModel,
  onModelChange,
}: {
  currentModel?: ModelInfo | null;
  onModelChange?: (model: ModelInfo) => void;
}) {
  const [open, setOpen] = useState(false);

  const handleSelect = (model: ModelInfo) => {
    onModelChange?.(model);
    setOpen(false);
  };

  const displayName = currentModel?.name || "选择模型";

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button className="text-muted-foreground" size="sm" variant="ghost">
          {displayName}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="space-y-1">
          {MODELS.map((model) => (
            <button
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                currentModel?.id === model.id ? "bg-accent" : ""
              }`}
              key={model.id}
              onClick={() => handleSelect(model)}
              type="button"
            >
              {model.name}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
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
  currentModel,
  onSessionSelect,
  onSessionCreate,
  onSessionDelete,
  onMessageSend,
  onAbort,
  onSkillSelect,
  onPermissionAllow,
  onPermissionDeny,
  onModelChange,
  showSessionList = true,
  agentName = "小A",
  agentAvatar,
  className,
}: ChatViewProps) {
  const navigate = useNavigate();

  const handleOpenSettings = () => {
    navigate({ to: "/settings" });
  };

  return (
    <div className={cn("flex h-full", className)} data-slot="chat-view">
      {showSessionList && (
        <SessionList
          className="w-60"
          currentSessionId={currentSessionId}
          onSessionCreate={onSessionCreate}
          onSessionDelete={onSessionDelete}
          onSessionSelect={onSessionSelect}
          sessions={sessions}
        />
      )}
      <div className="flex flex-1 flex-col">
        {/* 顶部工具栏 */}
        <div className="nodraglayer flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="font-medium">{agentName}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* 模型选择按钮 */}
            <ModelSelector
              currentModel={currentModel}
              onModelChange={onModelChange}
            />
            {/* 设置按钮 */}
            <Button
              className="size-8"
              onClick={handleOpenSettings}
              size="icon"
              variant="ghost"
            >
              <Settings className="size-4" />
            </Button>
          </div>
        </div>

        {/* 消息区域 */}
        <AgentMessageList
          agentAvatar={agentAvatar}
          agentName={agentName}
          className="flex-1"
          isStreaming={isGenerating}
          messages={messages}
          streamingMessage={streamingMessage}
          tools={tools}
        />

        {/* 输入区域 */}
        <MessageInput
          files={files}
          isGenerating={isGenerating}
          onAbort={onAbort}
          onSend={onMessageSend}
          onSkillSelect={onSkillSelect}
          skills={skills}
        />

        {/* 权限确认条 */}
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
