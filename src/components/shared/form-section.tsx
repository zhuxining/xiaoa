import type React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/tailwind";

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <Card className={cn("p-6", className)} data-slot="form-section">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="font-medium text-sm">{title}</h2>
        {description && (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </Card>
  );
}
