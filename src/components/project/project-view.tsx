import { Plus, Trash2 } from "lucide-react";
import type { Message, Session } from "@/components/chat/chat-view";
import { ChatView } from "@/components/chat/chat-view";
import type { FileMenuItem } from "@/components/chat/file-menu";
import type { PermissionRequest } from "@/components/chat/permission-dialog";
import type { SkillMenuItem } from "@/components/chat/skill-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils/tailwind";
import { type FileInfo, FilePreview } from "./file-preview";
import { type FileNode, FileTree } from "./file-tree";

type PermissionMode = "explore" | "review" | "auto";

interface ProjectViewProps {
  agentName?: string;
  className?: string;
  currentSessionId?: string;
  fileInfo?: FileInfo | null;
  files: FileNode[];
  filesForMention?: FileMenuItem[];
  isGenerating?: boolean;
  messages: Message[];
  onAbort?: () => void;
  onFileSelect: (node: FileNode) => void;
  onMessageSend: (message: string) => void;
  onPermissionAllow?: (request: PermissionRequest) => void;
  onPermissionDeny?: (request: PermissionRequest) => void;
  onPermissionModeChange?: (mode: PermissionMode) => void;
  onSessionCreate?: () => void;
  onSessionDelete?: (id: string) => void;
  onSessionSelect: (id: string) => void;
  permissionMode?: PermissionMode;
  permissionRequest?: PermissionRequest | null;
  selectedFileId?: string | null;
  sessions: Session[];
  skills?: SkillMenuItem[];
  viewMode: "chat" | "preview";
}

export function ProjectView({
  files,
  sessions,
  currentSessionId,
  messages,
  selectedFileId,
  fileInfo,
  viewMode,
  isGenerating,
  skills = [],
  filesForMention = [],
  onFileSelect,
  onSessionSelect,
  onSessionCreate,
  onSessionDelete,
  onMessageSend,
  onAbort,
  permissionMode = "review",
  onPermissionModeChange,
  permissionRequest,
  onPermissionAllow,
  onPermissionDeny,
  agentName,
  className,
}: ProjectViewProps) {
  let modeLabel = "Review";
  if (permissionMode === "explore") {
    modeLabel = "Explore";
  } else if (permissionMode === "auto") {
    modeLabel = "Auto";
  }

  return (
    <div className={cn("flex h-full", className)} data-slot="project-view">
      <ResizablePanelGroup autoSave="project-main" orientation="horizontal">
        {/* 左侧：文件树 + 会话列表 */}
        <ResizablePanel defaultSize={100} maxSize={240} minSize={15}>
          <ResizablePanelGroup
            autoSave="project-sidebar"
            orientation="vertical"
          >
            {/* 上部：文件树 */}
            <ResizablePanel defaultSize={100} minSize={20}>
              <div className="flex h-full flex-col border-r">
                <div className="border-b px-2 py-1 font-medium text-xs">
                  文件
                </div>
                <FileTree
                  className="flex-1"
                  nodes={files}
                  onSelect={onFileSelect}
                  selectedId={selectedFileId ?? undefined}
                />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            {/* 下部：会话列表 */}
            <ResizablePanel defaultSize={100} minSize={20}>
              <div className="flex h-full flex-col border-t border-r">
                <div className="flex items-center justify-between border-b px-2 py-1">
                  <span className="font-medium text-xs">会话</span>
                  <Button
                    className="h-6 w-6 p-0"
                    disabled={!onSessionCreate}
                    onClick={onSessionCreate}
                    size="icon-sm"
                    title="新建会话"
                    variant="ghost"
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
                <div className="flex-1 overflow-auto">
                  <div className="flex flex-col gap-1 p-2">
                    {sessions.map((session) => (
                      <div
                        className={cn(
                          "group flex w-full items-center gap-1 rounded-md px-1 py-1 text-left text-xs transition-colors hover:bg-muted",
                          session.id === currentSessionId && "bg-muted"
                        )}
                        key={session.id}
                      >
                        <button
                          className="flex-1 truncate rounded px-1 py-0.5 text-left"
                          onClick={() => onSessionSelect(session.id)}
                          type="button"
                        >
                          {session.title}
                        </button>
                        <Button
                          className="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => onSessionDelete?.(session.id)}
                          size="icon-sm"
                          title="删除会话"
                          variant="ghost"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    ))}
                    {sessions.length === 0 && (
                      <div className="flex flex-col items-center gap-2 py-4 text-center text-muted-foreground text-xs">
                        <div>暂无会话</div>
                        <Button
                          disabled={!onSessionCreate}
                          onClick={onSessionCreate}
                          size="sm"
                          variant="outline"
                        >
                          <Plus className="size-3.5" />
                          新建会话
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle withHandle />
        {/* 右侧：内容区 */}
        <ResizablePanel defaultSize={75}>
          <div className="flex items-center justify-end gap-2 border-b px-3 py-1.5">
            <Badge variant="outline">权限模式: {modeLabel}</Badge>
            <Select
              onValueChange={(value) =>
                onPermissionModeChange?.(value as PermissionMode)
              }
              value={permissionMode}
            >
              <SelectTrigger className="w-[128px]" size="sm">
                <SelectValue placeholder="选择模式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="explore">Explore（只读）</SelectItem>
                <SelectItem value="review">Review（确认）</SelectItem>
                <SelectItem value="auto">Auto（自动）</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {viewMode === "chat" ? (
            <ChatView
              agentName={agentName}
              currentSessionId={currentSessionId}
              files={filesForMention}
              isGenerating={isGenerating}
              messages={messages}
              onAbort={onAbort}
              onMessageSend={onMessageSend}
              onPermissionAllow={onPermissionAllow}
              onPermissionDeny={onPermissionDeny}
              onSessionCreate={onSessionCreate}
              onSessionSelect={onSessionSelect}
              permissionRequest={permissionRequest}
              sessions={sessions}
              showSessionList={false}
              skills={skills}
            />
          ) : (
            <FilePreview file={fileInfo ?? null} />
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
