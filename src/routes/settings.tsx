import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCurrentTheme, setTheme } from "@/actions/theme";
import { AboutSection } from "@/components/settings/about-section";
import { AppearanceForm } from "@/components/settings/appearance-form";
import { LLMConfigForm } from "@/components/settings/llm-config-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LLMConfig {
  provider: string;
  apiKey: string;
  model: string;
}

interface AppearanceConfig {
  theme: "light" | "dark" | "system";
  language: "zh-CN" | "en-US";
}

function SettingsPage() {
  const [llmConfig, setLLMConfig] = useState<LLMConfig>({
    provider: "anthropic",
    apiKey: "",
    model: "claude-sonnet-4-5-20250514",
  });

  const [appearanceConfig, setAppearanceConfig] = useState<AppearanceConfig>({
    theme: "system",
    language: "zh-CN",
  });

  // 加载当前主题设置
  useEffect(() => {
    getCurrentTheme().then(({ local }) => {
      if (local) {
        setAppearanceConfig((prev) => ({ ...prev, theme: local }));
      }
    });
  }, []);

  // 主题改变时立即应用
  const handleAppearanceChange = async (config: AppearanceConfig) => {
    setAppearanceConfig(config);
    if (config.theme !== appearanceConfig.theme) {
      await setTheme(config.theme);
    }
  };

  const handleSave = () => {
    // TODO: 保存其他设置
    console.log("Saving settings:", { llmConfig, appearanceConfig });
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        actions={<Button onClick={handleSave}>保存</Button>}
        description="配置应用程序"
        title="设置"
      />
      <ScrollArea className="flex-1">
        <div className="grid gap-6 p-6">
          <LLMConfigForm onChange={setLLMConfig} value={llmConfig} />
          <AppearanceForm
            onChange={handleAppearanceChange}
            value={appearanceConfig}
          />
          <AboutSection />
        </div>
      </ScrollArea>
    </div>
  );
}

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});
