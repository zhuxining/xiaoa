import type { AgentMessage, AgentTool } from "@mariozechner/pi-agent-core";
import {
  ApiKeysTab,
  ModelSelector,
  ProvidersModelsTab,
  ProxyTab,
  SettingsDialog,
} from "@mariozechner/pi-web-ui";
import { Settings, Sparkles } from "lucide-react";
import React, { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
  currentModel?: { id: string; name: string } | null;
  currentSessionId?: string;
  files?: FileMenuItem[];
  isGenerating?: boolean;
  /** Agent 消息列表（pi-agent-core AgentMessage[]） */
  messages: AgentMessage[];
  onAbort?: () => void;
  onMessageSend: (message: string) => void;
  onModelChange?: (model: { id: string; name: string }) => void;
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

// ArtifactsPanel Web Component 类型
interface ArtifactsPanelElement extends HTMLElement {
  artifacts: Map<string, { filename: string; content: string }>;
  collapsed: boolean;
  overlay: boolean;
  tool: AgentTool;
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
  onMessageSend,
  onAbort,
  onSkillSelect,
  onPermissionAllow,
  onPermissionDeny,
  onModelChange,
  showSessionList = true,
  className,
}: ChatViewProps) {
  const artifactsRef = useRef<ArtifactsPanelElement>(null);
  const [artifactsCollapsed, _setArtifactsCollapsed] = useState(true);

  // 打开模型选择器
  const handleOpenModelSelector = async () => {
    // 将当前模型转换为 pi-ai Model 格式（pi-ai Model 类型定义不完整）
    const model = currentModel
      ? ({
          id: currentModel.id,
          name: currentModel.name,
          provider: { id: "anthropic", name: "Anthropic" },
          contextLength: 200_000,
          inputPrice: 3,
          outputPrice: 15,
        } as unknown as Record<string, unknown>)
      : null;

    await ModelSelector.open(
      model as unknown as Parameters<typeof ModelSelector.open>[0],
      (selectedModel) => {
        onModelChange?.({
          id: selectedModel.id,
          name: selectedModel.name,
        });
      }
    );
  };

  // 打开设置对话框
  const handleOpenSettings = async () => {
    await SettingsDialog.open([
      new ProvidersModelsTab(),
      new ApiKeysTab(),
      new ProxyTab(),
    ]);
  };

  // ArtifactsPanel 命令式赋值
  useLayoutEffect(() => {
    if (!artifactsRef.current) {
      return;
    }
    const el = artifactsRef.current;
    el.collapsed = artifactsCollapsed;
  }, [artifactsCollapsed]);

  // 检查是否有 artifacts 工具
  const hasArtifactsTool = tools.some((t) => t.name === "artifacts");

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
        {/* 顶部工具栏 */}
        <div className="nodraglayer flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="font-medium">小A</span>
          </div>
          <div className="flex items-center gap-2">
            {/* 模型选择按钮 */}
            <Button
              className="text-muted-foreground"
              onClick={handleOpenModelSelector}
              size="sm"
              variant="ghost"
            >
              {currentModel?.name || "选择模型"}
            </Button>
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

        {/* 消息区域 + Artifacts 面板 */}
        <div className="flex flex-1 overflow-hidden">
          <PiMessageList
            className={cn(
              "flex-1 transition-all duration-300",
              hasArtifactsTool && !artifactsCollapsed && "flex-2"
            )}
            isStreaming={isGenerating}
            messages={messages}
            streamingMessage={streamingMessage}
            tools={tools}
          />

          {/* Artifacts 面板 */}
          {hasArtifactsTool &&
            React.createElement("artifacts-panel", {
              ref: artifactsRef,
              className: cn(
                "border-l bg-muted/30 transition-all duration-300",
                artifactsCollapsed ? "w-0 overflow-hidden" : "w-[400px]"
              ),
            })}
        </div>

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
