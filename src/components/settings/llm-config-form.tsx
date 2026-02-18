import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { LLMConfig } from "@/actions/config";
import { FormSection } from "@/components/shared/form-section";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LLMConfigFormProps {
  value: LLMConfig;
  onChange: (value: LLMConfig) => void;
  className?: string;
}

const PROVIDERS = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "openrouter", name: "OpenRouter" },
  { id: "deepseek", name: "DeepSeek" },
  { id: "ollama", name: "Ollama" },
  { id: "custom", name: "自定义" },
];

const MODELS_BY_PROVIDER: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4-turbo", "gpt-4"],
  anthropic: [
    "claude-sonnet-4-5-20250929",
    "claude-sonnet-4-5",
    "claude-opus-4-5",
    "claude-haiku-4-5-20251001",
    "claude-haiku-4-5",
  ],
  openrouter: ["anthropic/claude-3.5-sonnet", "openai/gpt-4o"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  ollama: ["llama3.1", "llama3.2", "mistral", "codellama"],
  custom: [],
};

export function LLMConfigForm({
  value,
  onChange,
  className,
}: LLMConfigFormProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  const models = MODELS_BY_PROVIDER[value.provider] || [];

  return (
    <FormSection
      className={className}
      description="配置 AI 模型服务商和 API 密钥"
      title="LLM 配置"
    >
      <Field orientation="horizontal">
        <FieldLabel className="w-24 shrink-0">服务商</FieldLabel>
        <Select
          onValueChange={(provider) =>
            onChange({
              ...value,
              provider: provider as LLMConfig["provider"],
              model: MODELS_BY_PROVIDER[provider]?.[0] || "",
            })
          }
          value={value.provider}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="选择服务商" />
          </SelectTrigger>
          <SelectContent>
            {PROVIDERS.map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                {provider.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field orientation="horizontal">
        <FieldLabel className="w-24 shrink-0">API Key</FieldLabel>
        <div className="relative flex-1">
          <Input
            className="pr-10"
            onChange={(e) => onChange({ ...value, apiKey: e.target.value })}
            placeholder="sk-..."
            type={showApiKey ? "text" : "password"}
            value={value.apiKey}
          />
          <Button
            className="absolute top-1/2 right-1 -translate-y-1/2"
            onClick={() => setShowApiKey(!showApiKey)}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            {showApiKey ? (
              <EyeOff className="size-3" />
            ) : (
              <Eye className="size-3" />
            )}
          </Button>
        </div>
      </Field>

      <Field orientation="horizontal">
        <FieldLabel className="w-24 shrink-0">默认模型</FieldLabel>
        <Select
          onValueChange={(model) => onChange({ ...value, model })}
          value={value.model}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="选择模型" />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </FormSection>
  );
}
