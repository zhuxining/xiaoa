import { useTranslation } from "react-i18next";
import { FormSection } from "@/components/shared/form-section";
import { Separator } from "@/components/ui/separator";

interface AboutSectionProps {
  className?: string;
}

export function AboutSection({ className }: AboutSectionProps) {
  const { t } = useTranslation();

  return (
    <FormSection className={className} title="关于">
      <div className="flex flex-col gap-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">版本</span>
          <span>{t("app.version")}</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">构建</span>
          <span>Electron + React</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">开源协议</span>
          <span>MIT</span>
        </div>
      </div>
    </FormSection>
  );
}
