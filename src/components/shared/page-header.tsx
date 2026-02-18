import type React from "react";
import { cn } from "@/utils/tailwind";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "draglayer relative z-50 flex items-center justify-between border-b px-6 py-4",
        className
      )}
      data-slot="page-header"
    >
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-lg">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {actions && (
        <div className="nodraglayer flex items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
