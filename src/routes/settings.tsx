import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getConfig,
  type LLMConfig,
  testApiKey,
  updateConfig,
} from "@/actions/config";
import { setTheme } from "@/actions/theme";
import { AboutSection } from "@/components/settings/about-section";
import { AppearanceForm } from "@/components/settings/appearance-form";
import { LLMConfigForm } from "@/components/settings/llm-config-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// Appearance 表单的配置类型
interface AppearanceConfig {
  language: "zh-CN" | "en-US";
  theme: "light" | "dark" | "system";
}

function SettingsPage() {
  const queryClient = useQueryClient();

  // 加载全局配置
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: getConfig,
  });

  // 本地状态用于表单编辑
  const [llmConfig, setLLMConfig] = useState<LLMConfig>({
    provider: "anthropic",
    apiKey: "",
    model: "claude-sonnet-4-5-20250514",
  });

  const [appearanceConfig, setAppearanceConfig] = useState<AppearanceConfig>({
    theme: "system",
    language: "zh-CN",
  });

  // 从配置初始化表单
  useEffect(() => {
    if (config) {
      setLLMConfig({
        provider: config.llm.provider,
        apiKey: config.llm.apiKey || "",
        model: config.llm.model,
      });
      setAppearanceConfig({
        theme: config.preferences.theme,
        language: config.preferences.language as AppearanceConfig["language"],
      });
    }
  }, [config]);

  // 保存配置
  const saveMutation = useMutation({
    mutationFn: async () => {
      await updateConfig({
        llm: {
          provider: llmConfig.provider,
          apiKey: llmConfig.apiKey || undefined,
          model: llmConfig.model,
        },
        preferences: appearanceConfig,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
      toast.success("设置已保存");
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
    },
  });

  // 测试 API Key
  const testMutation = useMutation({
    mutationFn: () => {
      return testApiKey(llmConfig.provider, llmConfig.apiKey ?? "");
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success("连接成功");
      } else {
        toast.error(`连接失败: ${result.error}`);
      }
    },
    onError: (error) => {
      toast.error(`测试失败: ${error.message}`);
    },
  });

  // 主题改变时立即应用
  const handleAppearanceChange = async (newConfig: typeof appearanceConfig) => {
    setAppearanceConfig(newConfig);
    if (newConfig.theme !== appearanceConfig.theme) {
      await setTheme(newConfig.theme);
    }
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleTestConnection = () => {
    if (!llmConfig.apiKey) {
      toast.error("请先输入 API Key");
      return;
    }
    testMutation.mutate();
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        actions={
          <div className="flex gap-2">
            <Button
              disabled={testMutation.isPending || !llmConfig.apiKey}
              onClick={handleTestConnection}
              variant="outline"
            >
              {testMutation.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              测试连接
            </Button>
            <Button disabled={saveMutation.isPending} onClick={handleSave}>
              {saveMutation.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              保存
            </Button>
          </div>
        }
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
