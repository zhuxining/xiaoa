import type { AgentMessage, AgentTool } from "@mariozechner/pi-agent-core";
import { useNavigate } from "@tanstack/react-router";
import { Settings, Sparkles } from "lucide-react";
import { useState } from "react";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";
import {
  getModelsByProvider,
  type ModelInfo,
  PROVIDERS,
} from "@/constants/models";
import type { ThinkingLevel } from "@/ipc/chat/schemas";
import type { ChatSession } from "@/types/session";
import { cn } from "@/utils/tailwind";
import { AgentConfirmation } from "./agent-confirmation";
import { AgentMessageList } from "./agent-message-list";
import { AgentPromptInput } from "./agent-prompt-input";
import type { FileMenuItem } from "./file-menu";
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
  onSessionRename?: (id: string, name: string) => void;
  onSessionSelect: (id: string) => void;
  onSkillSelect?: (skill: SkillMenuItem) => void;
  permissionRequest?: PermissionRequest | null;
  sessions: ChatSession[];
  showSessionList?: boolean;
  skills?: SkillMenuItem[];
  /** 流式消息（追加到 messages 末尾） */
  streamingMessage?: AgentMessage | null;
  thinkingLevel?: ThinkingLevel;
  /** 可用工具列表 */
  tools?: AgentTool[];
}

/**
 * 模型选择器组件
 */
function AgentModelSelector({
  currentModel,
  onModelChange,
}: {
  currentModel?: ModelInfo | null;
  onModelChange?: (model: ModelInfo) => void;
}) {
  const [open, setOpen] = useState(false);

  const displayName = currentModel?.name || "选择模型";

  return (
    <ModelSelector onOpenChange={setOpen} open={open}>
      <ModelSelectorTrigger asChild>
        <Button className="text-muted-foreground" size="sm" variant="ghost">
          {displayName}
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent title="选择模型">
        <ModelSelectorInput placeholder="搜索模型..." />
        <ModelSelectorList>
          <ModelSelectorEmpty>未找到匹配模型</ModelSelectorEmpty>
          {PROVIDERS.map((provider) => {
            const models = getModelsByProvider(provider.id);
            if (models.length === 0) {
              return null;
            }
            return (
              <ModelSelectorGroup heading={provider.name} key={provider.id}>
                {models.map((model) => (
                  <ModelSelectorItem
                    key={model.id}
                    onSelect={() => {
                      onModelChange?.(model);
                      setOpen(false);
                    }}
                    value={model.id}
                  >
                    <ModelSelectorLogo provider={model.provider} />
                    <ModelSelectorName>{model.name}</ModelSelectorName>
                  </ModelSelectorItem>
                ))}
              </ModelSelectorGroup>
            );
          })}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}

export function ChatView({
  sessions,
  currentSessionId,
  messages,
  isGenerating,
  streamingMessage,
  thinkingLevel = "minimal",
  skills = [],
  files = [],
  tools = [],
  permissionRequest,
  currentModel,
  onSessionSelect,
  onSessionCreate,
  onSessionDelete,
  onSessionRename,
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
          onSessionRename={onSessionRename}
          onSessionSelect={onSessionSelect}
          sessions={sessions}
        />
      )}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* 顶部工具栏 */}
        <div className="nodraglayer flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="font-medium">{agentName}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* 模型选择按钮 */}
            <AgentModelSelector
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
          thinkingLevel={thinkingLevel}
          tools={tools}
        />

        {/* 输入区域 */}
        <AgentPromptInput
          files={files}
          isGenerating={isGenerating}
          onAbort={onAbort}
          onSend={onMessageSend}
          onSkillSelect={onSkillSelect}
          skills={skills}
        />

        {/* 权限确认 */}
        <AgentConfirmation
          key={permissionRequest?.id ?? "permission-none"}
          onAllow={onPermissionAllow}
          onDeny={onPermissionDeny}
          request={permissionRequest ?? null}
        />
      </div>
    </div>
  );
}
