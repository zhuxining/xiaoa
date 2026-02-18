import type { Message, Session } from "@/components/chat/chat-view";
import { ChatView } from "@/components/chat/chat-view";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/utils/tailwind";
import { type FileInfo, FilePreview } from "./file-preview";
import { type FileNode, FileTree } from "./file-tree";

interface ProjectViewProps {
  files: FileNode[];
  sessions: Session[];
  currentSessionId?: string;
  messages: Message[];
  selectedFileId?: string | null;
  fileInfo?: FileInfo | null;
  viewMode: "chat" | "preview";
  isGenerating?: boolean;
  onFileSelect: (node: FileNode) => void;
  onSessionSelect: (id: string) => void;
  onSessionCreate?: () => void;
  onMessageSend: (message: string) => void;
  onAbort?: () => void;
  agentName?: string;
  className?: string;
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
  onFileSelect,
  onSessionSelect,
  onSessionCreate,
  onMessageSend,
  onAbort,
  agentName,
  className,
}: ProjectViewProps) {
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
                <div className="border-b px-2 py-1 font-medium text-xs">
                  会话
                </div>
                <div className="flex-1 overflow-auto">
                  <div className="flex flex-col gap-1 p-2">
                    {sessions.map((session) => (
                      <button
                        className={cn(
                          "w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted",
                          session.id === currentSessionId && "bg-muted"
                        )}
                        key={session.id}
                        onClick={() => onSessionSelect(session.id)}
                        type="button"
                      >
                        <div className="truncate">{session.title}</div>
                      </button>
                    ))}
                    {sessions.length === 0 && (
                      <div className="py-4 text-center text-muted-foreground text-xs">
                        暂无会话
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
          {viewMode === "chat" ? (
            <ChatView
              agentName={agentName}
              currentSessionId={currentSessionId}
              isGenerating={isGenerating}
              messages={messages}
              onAbort={onAbort}
              onMessageSend={onMessageSend}
              onSessionCreate={onSessionCreate}
              onSessionSelect={onSessionSelect}
              sessions={sessions}
              showSessionList={false}
            />
          ) : (
            <FilePreview file={fileInfo ?? null} />
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
