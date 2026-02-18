import { Monitor, Moon, Sun } from "lucide-react";
import { FormSection } from "@/components/shared/form-section";
import { Field, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface AppearanceConfig {
  language: "zh-CN" | "en-US";
  theme: "light" | "dark" | "system";
}

interface AppearanceFormProps {
  className?: string;
  onChange: (value: AppearanceConfig) => void;
  value: AppearanceConfig;
}

export function AppearanceForm({
  value,
  onChange,
  className,
}: AppearanceFormProps) {
  return (
    <FormSection
      className={className}
      description="自定义应用外观"
      title="外观"
    >
      <Field orientation="horizontal">
        <FieldLabel className="w-24 shrink-0">主题</FieldLabel>
        <ToggleGroup
          onValueChange={(theme) =>
            theme &&
            onChange({ ...value, theme: theme as AppearanceConfig["theme"] })
          }
          type="single"
          value={value.theme}
        >
          <ToggleGroupItem aria-label="浅色模式" value="light">
            <Sun className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem aria-label="深色模式" value="dark">
            <Moon className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem aria-label="跟随系统" value="system">
            <Monitor className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </Field>

      <Field orientation="horizontal">
        <FieldLabel className="w-24 shrink-0">语言</FieldLabel>
        <ToggleGroup
          onValueChange={(language) =>
            language &&
            onChange({
              ...value,
              language: language as AppearanceConfig["language"],
            })
          }
          type="single"
          value={value.language}
        >
          <ToggleGroupItem value="zh-CN">简体中文</ToggleGroupItem>
          <ToggleGroupItem value="en-US">English</ToggleGroupItem>
        </ToggleGroup>
      </Field>
    </FormSection>
  );
}
