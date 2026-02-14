import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";

interface AgentConfig {
  name: string;
  avatar?: string;
  persona: string;
  model: string;
}

const MODELS = [
  { id: "claude-sonnet-4-5-20250514", name: "Claude Sonnet 4.5" },
  { id: "claude-opus-4-5-20250929", name: "Claude Opus 4.6" },
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini" },
];

function AgentConfigPage() {
  const { workspaceId } = Route.useParams();
  const [config, setConfig] = useState<AgentConfig>({
    name: "小A",
    persona: "你是一个友好、专业的 AI 助手，致力于帮助用户解决问题。",
    model: "claude-sonnet-4-5-20250514",
  });

  const handleSave = () => {
    console.log("Saving agent config:", { workspaceId, config });
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        actions={<Button onClick={handleSave}>保存</Button>}
        description="自定义你的 AI 助手"
        title="Agent 配置"
      />
      <ScrollArea className="flex-1">
        <div className="p-6">
          <FormSection description="设置 Agent 的外观和身份" title="基本信息">
            <Field orientation="horizontal">
              <FieldLabel className="w-24 shrink-0">头像</FieldLabel>
              <AvatarUpload
                fallback={config.name?.charAt(0) || "A"}
                onChange={(avatar) => setConfig({ ...config, avatar })}
                value={config.avatar}
              />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel className="w-24 shrink-0">名称</FieldLabel>
              <Input
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="Agent 名称"
                value={config.name}
              />
            </Field>
            <Field>
              <FieldLabel>人设</FieldLabel>
              <FieldDescription>
                描述 Agent 的性格、专业领域和行为方式
              </FieldDescription>
              <Textarea
                onChange={(e) =>
                  setConfig({ ...config, persona: e.target.value })
                }
                placeholder="你是一个..."
                rows={4}
                value={config.persona}
              />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel className="w-24 shrink-0">模型</FieldLabel>
              <Select
                onValueChange={(model) => setConfig({ ...config, model })}
                value={config.model}
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
        </div>
      </ScrollArea>
    </div>
  );
}

export const Route = createFileRoute("/workspace/$workspaceId/agent")({
  component: AgentConfigPage,
});
