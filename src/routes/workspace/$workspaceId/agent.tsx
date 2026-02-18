import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { AgentConfig, WorkspacePermissions } from "@/actions/workspace";
import { getWorkspace, updateWorkspace } from "@/actions/workspace";
import { AvatarUpload } from "@/components/shared/avatar-upload";
import { FormSection } from "@/components/shared/form-section";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const MODELS = [
  { id: "claude-sonnet-4-5-20250514", name: "Claude Sonnet 4.5" },
  { id: "claude-opus-4-5-20250929", name: "Claude Opus 4.6" },
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini" },
];

function AgentConfigPage() {
  const { workspaceId } = Route.useParams();
  const queryClient = useQueryClient();

  // 加载工作区数据
  const { data: workspace, isLoading } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => getWorkspace(workspaceId),
  });

  // 本地编辑状态
  const [agent, setAgent] = useState<AgentConfig>({
    name: "",
    systemPrompt: "",
    model: "claude-sonnet-4-5-20250514",
  });
  const [permissions, setPermissions] = useState<WorkspacePermissions>({
    mode: "review",
    dangerousAutoConfirm: false,
  });

  // 同步服务器数据到本地状态
  useEffect(() => {
    if (workspace?.agent) {
      setAgent(workspace.agent);
    }
    if (workspace?.permissions) {
      setPermissions({
        mode: workspace.permissions.mode ?? "review",
        dangerousAutoConfirm:
          workspace.permissions.dangerousAutoConfirm ?? false,
        allowedWritePaths: workspace.permissions.allowedWritePaths,
      });
    }
  }, [workspace]);

  // 保存 mutation
  const saveMutation = useMutation({
    mutationFn: () =>
      updateWorkspace({
        id: workspaceId,
        agent,
        permissions,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Agent 配置已保存");
    },
    onError: (error) => {
      toast.error(`保存失败: ${(error as Error).message}`);
    },
  });

  // 检查是否有更改
  const hasChanges =
    JSON.stringify(workspace?.agent) !== JSON.stringify(agent) ||
    JSON.stringify(workspace?.permissions ?? null) !==
      JSON.stringify(permissions);

  const handleSave = () => {
    if (!agent.name.trim()) {
      toast.error("请输入 Agent 名称");
      return;
    }
    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        工作区不存在
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        actions={
          <Button
            disabled={!hasChanges || saveMutation.isPending}
            onClick={handleSave}
          >
            {saveMutation.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            保存
          </Button>
        }
        description="自定义你的 AI 助手"
        title="Agent 配置"
      />
      <ScrollArea className="flex-1">
        <div className="p-6">
          <FormSection description="设置 Agent 的外观和身份" title="基本信息">
            <Field orientation="horizontal">
              <FieldLabel className="w-24 shrink-0">头像</FieldLabel>
              <AvatarUpload
                fallback={agent.name?.charAt(0) || "A"}
                onChange={(avatar) => setAgent({ ...agent, avatar })}
                value={agent.avatar}
              />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel className="w-24 shrink-0">名称</FieldLabel>
              <Input
                onChange={(e) => setAgent({ ...agent, name: e.target.value })}
                placeholder="Agent 名称"
                value={agent.name}
              />
            </Field>
            <Field>
              <FieldLabel>人设</FieldLabel>
              <FieldDescription>
                描述 Agent 的性格、专业领域和行为方式
              </FieldDescription>
              <Textarea
                onChange={(e) =>
                  setAgent({ ...agent, systemPrompt: e.target.value })
                }
                placeholder="你是一个..."
                rows={4}
                value={agent.systemPrompt}
              />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel className="w-24 shrink-0">模型</FieldLabel>
              <Select
                onValueChange={(model) => setAgent({ ...agent, model })}
                value={agent.model}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FormSection>
          <FormSection
            description="控制 Agent 执行工具时的权限策略"
            title="权限模式"
          >
            <Field orientation="horizontal">
              <FieldLabel className="w-24 shrink-0">模式</FieldLabel>
              <Select
                onValueChange={(mode) =>
                  setPermissions((prev) => ({
                    ...prev,
                    mode: mode as WorkspacePermissions["mode"],
                  }))
                }
                value={permissions.mode}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择权限模式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="explore">Explore（仅读取）</SelectItem>
                  <SelectItem value="review">Review（危险操作确认）</SelectItem>
                  <SelectItem value="auto">Auto（自动执行）</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field orientation="horizontal">
              <FieldLabel className="w-24 shrink-0">危险自动执行</FieldLabel>
              <div className="flex flex-1 items-center justify-between rounded-md border px-3 py-2">
                <FieldDescription className="m-0">
                  Auto 模式下是否自动通过高风险操作
                </FieldDescription>
                <Switch
                  checked={permissions.dangerousAutoConfirm ?? false}
                  onCheckedChange={(checked) =>
                    setPermissions((prev) => ({
                      ...prev,
                      dangerousAutoConfirm: checked,
                    }))
                  }
                />
              </div>
            </Field>
          </FormSection>
        </div>
      </ScrollArea>
    </div>
  );
}

export const Route = createFileRoute("/workspace/$workspaceId/agent")({
  component: AgentConfigPage,
});
