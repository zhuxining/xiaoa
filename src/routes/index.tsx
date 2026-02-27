import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { getConfig, updateLLMConfig } from "@/actions/config";
import { ChatView } from "@/components/chat/chat-view";
import { getModelName, type ModelInfo } from "@/constants/models";
import { useChatSession } from "@/hooks/use-chat-session";

function HomePage() {
  const queryClient = useQueryClient();

  // 模型配置
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: getConfig,
  });

  const currentModel = config?.llm
    ? {
        id: config.llm.model,
        name: getModelName(config.llm.model),
        provider: config.llm.provider,
      }
    : null;

  const handleModelChange = useCallback(
    async (model: ModelInfo) => {
      await updateLLMConfig({ model: model.id });
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
    [queryClient]
  );

  // 会话 + 对话状态
  const chat = useChatSession({
    scope: "global",
    workspaceId: null,
  });

  return (
    <ChatView
      agentName="小A"
      currentModel={currentModel}
      currentSessionId={chat.currentSessionId}
      isGenerating={chat.isGenerating}
      messages={chat.messages}
      onAbort={chat.abort}
      onMessageSend={chat.sendMessage}
      onModelChange={handleModelChange}
      onPermissionAllow={chat.allowPermission}
      onPermissionDeny={chat.denyPermission}
      onSessionCreate={chat.createSession}
      onSessionDelete={chat.deleteSession}
      onSessionRename={chat.renameSession}
      onSessionSelect={chat.selectSession}
      permissionRequest={chat.permissionRequest}
      sessions={chat.sessions}
      streamingMessage={chat.streamingMessage}
    />
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
