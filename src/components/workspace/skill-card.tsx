import { Wrench } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/tailwind";

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon?: string;
  argumentHint?: string;
  prompt: string;
  references?: Array<{ name: string; path: string }>;
  enabled: boolean;
}

interface SkillCardProps {
  skill: Skill;
  isSelected: boolean;
  onClick: () => void;
  className?: string;
}

export function SkillCard({
  skill,
  isSelected,
  onClick,
  className,
}: SkillCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer p-3 transition-colors hover:bg-muted",
        isSelected && "bg-muted ring-1 ring-primary",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-8 items-center justify-center rounded-md bg-muted">
          {skill.icon ? (
            <span>{skill.icon}</span>
          ) : (
            <Wrench className="size-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-sm">{skill.name}</span>
            <StatusBadge status={skill.enabled ? "success" : "default"}>
              {skill.enabled ? "启用" : "禁用"}
            </StatusBadge>
          </div>
          <p className="truncate text-muted-foreground text-xs">
            {skill.description}
          </p>
        </div>
      </div>
    </Card>
  );
}
